import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { parseJour } from '$lib/dates';
import { recupererProduitOpenFoodFacts, type ProduitOpenFoodFacts } from '$lib/server/openfoodfacts';
import type { Actions, PageServerLoad } from './$types';

const FRAICHEUR_CACHE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Cache local des fiches produit, indexé sur l'EAN. Avant tout appel
 * réseau, sert la fiche en base si elle a moins de 30 jours. Si Open Food
 * Facts ne connaît pas (encore) le produit et qu'aucune fiche n'existe déjà,
 * ne crée rien : une fiche vide (sans nom) n'aurait aucun sens à mettre en
 * cache. Sur échec réseau ou "non trouvé" alors qu'une fiche existait déjà
 * (même périmée), on la ressert plutôt que de perdre l'information.
 */
async function obtenirProduitParEan(ean: string): Promise<ProduitOpenFoodFacts | null> {
	const existant = await prisma.produit.findUnique({ where: { ean } });

	const frais =
		existant?.dateMajCache != null &&
		Date.now() - existant.dateMajCache.getTime() < FRAICHEUR_CACHE_MS;

	if (existant && frais) {
		return {
			nom: existant.nom,
			marque: existant.marque,
			contenance: existant.contenance,
			imageUrl: existant.imageUrl
		};
	}

	const donnees = await recupererProduitOpenFoodFacts(ean, env.OFF_CONTACT_EMAIL);

	if (donnees === null) {
		if (existant === null) return null;
		return {
			nom: existant.nom,
			marque: existant.marque,
			contenance: existant.contenance,
			imageUrl: existant.imageUrl
		};
	}

	const produit = await prisma.produit.upsert({
		where: { ean },
		create: { ean, saisiManuelle: false, dateMajCache: new Date(), ...donnees },
		update: { saisiManuelle: false, dateMajCache: new Date(), ...donnees }
	});

	return {
		nom: produit.nom,
		marque: produit.marque,
		contenance: produit.contenance,
		imageUrl: produit.imageUrl
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const ean = url.searchParams.get('ean');

	const [categories, emplacements, prefill] = await Promise.all([
		prisma.categorie.findMany({ orderBy: { nom: 'asc' } }),
		prisma.emplacement.findMany({ orderBy: { nom: 'asc' } }),
		ean ? obtenirProduitParEan(ean) : Promise.resolve(null)
	]);

	return {
		categories,
		emplacements,
		ean,
		prefill,
		// Un EAN a été scanné mais ni le cache local ni Open Food Facts ne
		// connaissent ce produit : à distinguer de "pas de scan du tout"
		// (ean === null), où ce message n'a pas lieu d'être.
		produitInconnu: ean !== null && prefill === null
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const donnees = await request.formData();
		const texte = (champ: string) => String(donnees.get(champ) ?? '').trim();

		const saisie = {
			nom: texte('nom'),
			marque: texte('marque'),
			contenance: texte('contenance'),
			categorieId: texte('categorieId'),
			emplacementId: texte('emplacementId'),
			quantite: texte('quantite'),
			dateImprimee: texte('dateImprimee'),
			typeDate: texte('typeDate'),
			dejaOuvert: donnees.get('dejaOuvert') === 'on',
			dateOuverture: texte('dateOuverture'),
			delaiOuverture: texte('delaiOuverture'),
			ean: texte('ean')
		};

		const erreurs: Record<string, string> = {};

		if (saisie.nom === '') {
			erreurs.nom = 'Le nom du produit est obligatoire.';
		}

		if (saisie.emplacementId === '') {
			erreurs.emplacementId = "L'emplacement est obligatoire.";
		}

		const quantite = Number(saisie.quantite.replace(',', '.'));
		if (!Number.isFinite(quantite) || quantite <= 0) {
			erreurs.quantite = 'La quantité doit être un nombre supérieur à zéro.';
		}

		const dateImprimee = parseJour(saisie.dateImprimee);
		if (dateImprimee === null) {
			erreurs.dateImprimee = 'La date imprimée est obligatoire.';
		}

		if (saisie.typeDate !== 'DLC' && saisie.typeDate !== 'DDM') {
			erreurs.typeDate = 'Choisissez DLC ou DDM.';
		}

		let dateOuverture: Date | null = null;
		if (saisie.dejaOuvert) {
			dateOuverture = parseJour(saisie.dateOuverture);
			if (dateOuverture === null) {
				erreurs.dateOuverture = "Indiquez la date d'ouverture.";
			}
		}

		// Optionnel : laisser vide retombe sur le délai de la catégorie (voir
		// dateEffective dans $lib/dates). Ce champ ne fait que surcharger cette
		// valeur pour cet exemplaire précis.
		let delaiOuverture: number | null = null;
		if (saisie.delaiOuverture !== '') {
			const valeur = Number(saisie.delaiOuverture);
			if (!Number.isInteger(valeur) || valeur < 0) {
				erreurs.delaiOuverture = 'Le délai doit être un nombre entier de jours, positif ou nul.';
			} else {
				delaiOuverture = valeur;
			}
		}

		// Les listes déroulantes viennent du serveur, mais un POST forgé peut
		// contenir n'importe quel identifiant : on vérifie qu'ils existent.
		if (saisie.emplacementId !== '') {
			const emplacement = await prisma.emplacement.findUnique({
				where: { id: saisie.emplacementId },
				select: { id: true }
			});
			if (!emplacement) erreurs.emplacementId = 'Emplacement inconnu.';
		}

		if (saisie.categorieId !== '') {
			const categorie = await prisma.categorie.findUnique({
				where: { id: saisie.categorieId },
				select: { id: true }
			});
			if (!categorie) erreurs.categorieId = 'Catégorie inconnue.';
		}

		if (Object.keys(erreurs).length > 0) {
			return fail(400, { erreurs, saisie });
		}

		const eanSaisi = saisie.ean || null;

		// Un même produit peut avoir plusieurs exemplaires en stock : on réutilise
		// la fiche produit existante plutôt que d'en créer une par exemplaire.
		// L'EAN est cherché en priorité : si le chargement de la page a déjà mis
		// en cache une fiche pour ce code (trouvée sur Open Food Facts), la
		// retrouver par le nom ne suffit pas à coup sûr (l'utilisateur a pu
		// modifier le nom préempli) et créer une deuxième fiche avec le même EAN
		// violerait sa contrainte d'unicité.
		const existant =
			(eanSaisi ? await prisma.produit.findUnique({ where: { ean: eanSaisi }, select: { id: true } }) : null) ??
			(await prisma.produit.findFirst({
				where: { nom: { equals: saisie.nom, mode: 'insensitive' } },
				select: { id: true }
			}));

		const produitId =
			existant?.id ??
			(
				await prisma.produit.create({
					data: {
						nom: saisie.nom,
						marque: saisie.marque || null,
						contenance: saisie.contenance || null,
						categorieId: saisie.categorieId || null,
						// Cette branche ne s'atteint que si aucune fiche n'existait déjà
						// pour cet EAN ou ce nom : la saisie reste manuelle même quand un
						// EAN a été scanné mais qu'Open Food Facts ne le connaissait pas.
						saisiManuelle: true,
						ean: eanSaisi
					},
					select: { id: true }
				})
			).id;

		await prisma.articleStock.create({
			data: {
				produitId,
				emplacementId: saisie.emplacementId,
				quantite,
				dateImprimee: dateImprimee!,
				typeDate: saisie.typeDate as 'DLC' | 'DDM',
				estOuvert: saisie.dejaOuvert,
				dateOuverture,
				delaiOuverture
			}
		});

		redirect(303, '/');
	}
};
