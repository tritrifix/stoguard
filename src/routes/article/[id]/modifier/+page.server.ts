import { error, fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { versChampDate } from '$lib/dates';
import { validerChampsArticle } from '$lib/server/validationArticle';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const article = await prisma.articleStock.findUnique({
		where: { id: params.id },
		include: { produit: true }
	});

	// Un exemplaire déjà sorti du stock n'est jamais listé sur la page
	// d'accueil (seule origine normale de ce lien) : atteindre cette page
	// pour un tel article ne peut venir que d'un lien resté ouvert après
	// coup, un vrai 404 plutôt qu'un formulaire d'édition sur de
	// l'historique.
	if (!article || article.dateSortie !== null) {
		error(404, 'Article introuvable.');
	}

	const [categories, emplacements, nombreArticlesPartages] = await Promise.all([
		prisma.categorie.findMany({ orderBy: { nom: 'asc' } }),
		prisma.emplacement.findMany({ orderBy: { nom: 'asc' } }),
		prisma.articleStock.count({
			where: { produitId: article.produitId, dateSortie: null }
		})
	]);

	return {
		categories,
		emplacements,
		article: {
			id: article.id,
			quantite: Number(article.quantite),
			emplacementId: article.emplacementId,
			dateImprimee: versChampDate(article.dateImprimee),
			typeDate: article.typeDate,
			delaiOuverture: article.delaiOuverture,
			notes: article.notes,
			nom: article.produit.nom,
			marque: article.produit.marque,
			contenance: article.produit.contenance,
			categorieId: article.produit.categorieId,
			nombreArticlesPartages,
			// Corriger la fiche d'un produit issu d'Open Food Facts la marque
			// comme saisie manuellement (voir l'action) : ce message prévient
			// avant coup, pas seulement après.
			produitIssuOpenFoodFacts: article.produit.ean !== null && !article.produit.saisiManuelle
		}
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
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
			delaiOuverture: texte('delaiOuverture'),
			notes: texte('notes')
		};

		const article = await prisma.articleStock.findUnique({
			where: { id: params.id },
			select: {
				produitId: true,
				dateSortie: true,
				produit: { select: { nom: true, marque: true, contenance: true, categorieId: true, ean: true, saisiManuelle: true } }
			}
		});

		if (!article || article.dateSortie !== null) {
			const erreurs: Record<string, string> = { global: "Cet article n'existe plus." };
			return fail(404, { erreurs, saisie });
		}

		const resultat = await validerChampsArticle(saisie);
		if (Object.keys(resultat.erreurs).length > 0) {
			return fail(400, { erreurs: resultat.erreurs, saisie });
		}

		const nouvelleMarque = saisie.marque || null;
		const nouvelleContenance = saisie.contenance || null;
		const nouvelleCategorieId = saisie.categorieId || null;

		// N'affecte saisiManuelle que si la fiche produit (groupe B, partagé)
		// change réellement : soumettre le formulaire sans y toucher ne doit
		// pas la marquer manuelle pour autant.
		const groupeBChange =
			article.produit.nom !== saisie.nom ||
			article.produit.marque !== nouvelleMarque ||
			article.produit.contenance !== nouvelleContenance ||
			article.produit.categorieId !== nouvelleCategorieId;

		// Sinon le rafraîchissement du cache Open Food Facts à 30 jours
		// écraserait silencieusement la correction au prochain scan.
		const doitMarquerManuelle =
			groupeBChange && article.produit.ean !== null && !article.produit.saisiManuelle;

		await prisma.$transaction([
			prisma.produit.update({
				where: { id: article.produitId },
				data: {
					nom: saisie.nom,
					marque: nouvelleMarque,
					contenance: nouvelleContenance,
					categorieId: nouvelleCategorieId,
					...(doitMarquerManuelle ? { saisiManuelle: true } : {})
				}
			}),
			prisma.articleStock.update({
				where: { id: params.id },
				data: {
					quantite: resultat.quantite,
					emplacementId: saisie.emplacementId,
					dateImprimee: resultat.dateImprimee,
					typeDate: resultat.typeDate,
					delaiOuverture: resultat.delaiOuverture,
					notes: saisie.notes || null
				}
			})
		]);

		redirect(303, '/');
	}
};
