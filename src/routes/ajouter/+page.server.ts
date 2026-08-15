import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { parseJour } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [categories, emplacements] = await Promise.all([
		prisma.categorie.findMany({ orderBy: { nom: 'asc' } }),
		prisma.emplacement.findMany({ orderBy: { nom: 'asc' } })
	]);

	return { categories, emplacements };
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
			dateOuverture: texte('dateOuverture')
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

		// Un même produit peut avoir plusieurs exemplaires en stock : on réutilise
		// la fiche produit existante plutôt que d'en créer une par exemplaire.
		const existant = await prisma.produit.findFirst({
			where: { nom: { equals: saisie.nom, mode: 'insensitive' } },
			select: { id: true }
		});

		const produitId =
			existant?.id ??
			(
				await prisma.produit.create({
					data: {
						nom: saisie.nom,
						marque: saisie.marque || null,
						contenance: saisie.contenance || null,
						categorieId: saisie.categorieId || null,
						saisiManuelle: true,
						ean: null
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
				dateOuverture
			}
		});

		redirect(303, '/');
	}
};
