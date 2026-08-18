import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { parseJour } from '$lib/dates';
import { recupererProduitOpenFoodFacts, type ProduitOpenFoodFacts } from '$lib/server/openfoodfacts';
import { categorieAMettreAJour } from '$lib/produit';
import { validerChampsArticle } from '$lib/server/validationArticle';
import type { Actions, PageServerLoad } from './$types';

const FRAICHEUR_CACHE_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Cache local des fiches produit, indexé sur l'EAN. Avant tout appel
 * réseau, sert la fiche en base si elle a moins de 30 jours. Si Open Food
 * Facts ne connaît pas (encore) le produit et qu'aucune fiche n'existe déjà,
 * ne crée rien : une fiche vide (sans nom) n'aurait aucun sens à mettre en
 * cache. Sur échec réseau ou "non trouvé" alors qu'une fiche existait déjà
 * (même périmée), on la ressert plutôt que de perdre l'information.
 *
 * saisiManuelle: true signifie qu'une correction humaine a été faite (voir
 * /article/[id]/modifier) : la fraîcheur de 30 jours ne s'applique alors
 * plus jamais, sans quoi le rafraîchissement automatique écraserait
 * silencieusement la correction au scan suivant.
 */
type PrefillAjout = ProduitOpenFoodFacts & { categorieId: string | null };

async function obtenirProduitParEan(ean: string): Promise<PrefillAjout | null> {
	const existant = await prisma.produit.findUnique({ where: { ean } });

	const frais =
		existant?.saisiManuelle ||
		(existant?.dateMajCache != null &&
			Date.now() - existant.dateMajCache.getTime() < FRAICHEUR_CACHE_MS);

	if (existant && frais) {
		return {
			nom: existant.nom,
			marque: existant.marque,
			contenance: existant.contenance,
			imageUrl: existant.imageUrl,
			categorieId: existant.categorieId
		};
	}

	const donnees = await recupererProduitOpenFoodFacts(ean, env.OFF_CONTACT_EMAIL);

	if (donnees === null) {
		if (existant === null) return null;
		return {
			nom: existant.nom,
			marque: existant.marque,
			contenance: existant.contenance,
			imageUrl: existant.imageUrl,
			categorieId: existant.categorieId
		};
	}

	// donnees (Open Food Facts) ne contient jamais categorieId : OFF n'a pas
	// d'avis sur nos catégories locales, et la catégorie ne doit changer que
	// par un choix humain, jamais par ce rafraîchissement de cache.
	const produit = await prisma.produit.upsert({
		where: { ean },
		create: { ean, saisiManuelle: false, dateMajCache: new Date(), ...donnees },
		update: { saisiManuelle: false, dateMajCache: new Date(), ...donnees }
	});

	return {
		nom: produit.nom,
		marque: produit.marque,
		contenance: produit.contenance,
		imageUrl: produit.imageUrl,
		categorieId: produit.categorieId
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

		const resultat = await validerChampsArticle(saisie);
		const erreurs = resultat.erreurs;

		let dateOuverture: Date | null = null;
		if (saisie.dejaOuvert) {
			dateOuverture = parseJour(saisie.dateOuverture);
			if (dateOuverture === null) {
				erreurs.dateOuverture = "Indiquez la date d'ouverture.";
			}
		}

		if (Object.keys(erreurs).length > 0) {
			return fail(400, { erreurs, saisie });
		}

		const eanSaisi = saisie.ean || null;
		const categorieChoisie = saisie.categorieId || null;

		// Un même produit peut avoir plusieurs exemplaires en stock : on réutilise
		// la fiche produit existante plutôt que d'en créer une par exemplaire.
		// L'EAN est cherché en priorité : si le chargement de la page a déjà mis
		// en cache une fiche pour ce code (trouvée sur Open Food Facts), la
		// retrouver par le nom ne suffit pas à coup sûr (l'utilisateur a pu
		// modifier le nom préempli) et créer une deuxième fiche avec le même EAN
		// violerait sa contrainte d'unicité.
		const existant =
			(eanSaisi
				? await prisma.produit.findUnique({ where: { ean: eanSaisi }, select: { id: true, categorieId: true } })
				: null) ??
			(await prisma.produit.findFirst({
				where: { nom: { equals: saisie.nom, mode: 'insensitive' } },
				select: { id: true, categorieId: true }
			}));

		// Création du produit, mise à jour de sa catégorie et création de
		// l'exemplaire dans une seule transaction : sinon on peut se retrouver
		// avec un article créé mais un produit non mis à jour (ou l'inverse)
		// en cas d'erreur en cours de route.
		await prisma.$transaction(async (tx) => {
			let produitId: string;

			if (existant) {
				produitId = existant.id;
				// La catégorie choisie ici peut corriger celle déjà en fiche (mal
				// choisie au premier scan, par exemple) : la correction profite
				// alors à tous les futurs scans du même produit, pas seulement à
				// cet exemplaire.
				const nouvelleCategorie = categorieAMettreAJour(existant.categorieId, categorieChoisie);
				if (nouvelleCategorie !== undefined) {
					await tx.produit.update({
						where: { id: existant.id },
						data: { categorieId: nouvelleCategorie }
					});
				}
			} else {
				const nouveauProduit = await tx.produit.create({
					data: {
						nom: saisie.nom,
						marque: saisie.marque || null,
						contenance: saisie.contenance || null,
						categorieId: categorieChoisie,
						// Cette branche ne s'atteint que si aucune fiche n'existait déjà
						// pour cet EAN ou ce nom : la saisie reste manuelle même quand un
						// EAN a été scanné mais qu'Open Food Facts ne le connaissait pas.
						saisiManuelle: true,
						ean: eanSaisi
					},
					select: { id: true }
				});
				produitId = nouveauProduit.id;
			}

			await tx.articleStock.create({
				data: {
					produitId,
					emplacementId: saisie.emplacementId,
					quantite: resultat.quantite,
					dateImprimee: resultat.dateImprimee,
					typeDate: resultat.typeDate,
					estOuvert: saisie.dejaOuvert,
					dateOuverture,
					delaiOuverture: resultat.delaiOuverture
				}
			});
		});

		redirect(303, '/');
	}
};
