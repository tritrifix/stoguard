import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { aujourdhui, dateEffective, etatArticle, joursRestants, severite } from '$lib/dates';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const emplacementFiltre = url.searchParams.get('emplacement');

	const [articles, emplacements] = await Promise.all([
		prisma.articleStock.findMany({
			// dateSortie null = toujours en stock. Les articles consommés ou jetés
			// restent en base pour l'historique mais disparaissent de la liste.
			where: {
				dateSortie: null,
				...(emplacementFiltre ? { emplacementId: emplacementFiltre } : {})
			},
			include: {
				emplacement: true,
				produit: { include: { categorie: true } }
			}
		}),
		prisma.emplacement.findMany({ orderBy: { nom: 'asc' } })
	]);

	const maintenant = aujourdhui();

	const lignes = articles
		.map((article) => {
			const echeance = dateEffective({
				dateImprimee: article.dateImprimee,
				estOuvert: article.estOuvert,
				dateOuverture: article.dateOuverture,
				delaiOuverture: article.delaiOuverture,
				delaiCategorie: article.produit.categorie?.delaiApresOuverture ?? null
			});
			const etat = etatArticle(echeance, maintenant);

			return {
				id: article.id,
				nom: article.produit.nom,
				marque: article.produit.marque,
				contenance: article.produit.contenance,
				emplacement: article.emplacement.nom,
				// Decimal Prisma -> nombre simple, sérialisable vers le client.
				quantite: Number(article.quantite),
				typeDate: article.typeDate,
				estOuvert: article.estOuvert,
				dateOuverture: article.dateOuverture,
				dateEffective: echeance,
				jours: joursRestants(echeance, maintenant),
				etat,
				severite: severite(etat, article.typeDate)
			};
		})
		// Tri par urgence : échéance la plus proche en tête.
		.sort((a, b) => a.dateEffective.getTime() - b.dateEffective.getTime());

	return { lignes, emplacements, emplacementFiltre };
};

/** Sort l'article du stock en enregistrant le motif dans l'historique. */
async function sortirDuStock(articleId: string, motif: 'CONSOMME' | 'JETE_PERIME' | 'JETE_AUTRE') {
	const article = await prisma.articleStock.findUnique({
		where: { id: articleId },
		select: { quantite: true, dateSortie: true }
	});

	if (!article || article.dateSortie !== null) {
		return fail(404, { erreur: "Cet article n'est plus en stock." });
	}

	await prisma.$transaction([
		prisma.consommation.create({
			data: { articleStockId: articleId, motif, quantite: article.quantite }
		}),
		prisma.articleStock.update({
			where: { id: articleId },
			data: { dateSortie: new Date() }
		})
	]);
}

export const actions: Actions = {
	ouvrir: async ({ request }) => {
		const donnees = await request.formData();
		const id = String(donnees.get('id') ?? '');

		const article = await prisma.articleStock.findUnique({
			where: { id },
			select: { estOuvert: true, dateSortie: true }
		});

		if (!article || article.dateSortie !== null) {
			return fail(404, { erreur: "Cet article n'est plus en stock." });
		}
		if (article.estOuvert) {
			return { succes: true };
		}

		await prisma.articleStock.update({
			where: { id },
			// dateOuverture est un jour calendaire, pas un instant : même
			// convention que les dates saisies au formulaire.
			data: { estOuvert: true, dateOuverture: aujourdhui() }
		});

		return { succes: true };
	},

	consommer: async ({ request }) => {
		const donnees = await request.formData();
		const echec = await sortirDuStock(String(donnees.get('id') ?? ''), 'CONSOMME');
		return echec ?? { succes: true };
	},

	jeter: async ({ request }) => {
		const donnees = await request.formData();
		const motif = donnees.get('motif') === 'JETE_AUTRE' ? 'JETE_AUTRE' : 'JETE_PERIME';
		const echec = await sortirDuStock(String(donnees.get('id') ?? ''), motif);
		return echec ?? { succes: true };
	},

	deconnexion: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		redirect(303, '/login');
	}
};
