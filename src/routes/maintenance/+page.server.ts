import { fail } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const CONFIRMATION_ATTENDUE = 'SUPPRIMER';

export const load: PageServerLoad = async () => {
	const [totalConsommations, articlesSortis, totalArticles] = await Promise.all([
		prisma.consommation.count(),
		prisma.articleStock.count({ where: { dateSortie: { not: null } } }),
		prisma.articleStock.count()
	]);

	return { totalConsommations, articlesSortis, totalArticles };
};

function verifierConfirmation(donnees: FormData): boolean {
	return String(donnees.get('confirmation') ?? '') === CONFIRMATION_ATTENDUE;
}

export const actions: Actions = {
	/**
	 * Vide l'historique : toutes les Consommation, et les ArticleStock déjà
	 * sortis (dateSortie non nul). Ne touche pas aux articles encore en
	 * stock, ni à Produit/Categorie/Emplacement (le référentiel produit est
	 * le cache Open Food Facts — le perdre obligerait à réinterroger l'API à
	 * chaque scan).
	 */
	viderHistorique: async ({ request }) => {
		const donnees = await request.formData();
		// Vérifié côté serveur : un contrôle uniquement en JavaScript se
		// contourne trivialement (formulaire désactivé mais POST direct).
		if (!verifierConfirmation(donnees)) {
			return fail(400, { erreur: 'Confirmation incorrecte.', purge: 'historique' as const });
		}

		// Consommation.articleStockId est en onDelete: Restrict : les
		// consommations doivent partir avant les articles qui les portent.
		const [consommationsSupprimees, articlesSupprimes] = await prisma.$transaction([
			prisma.consommation.deleteMany(),
			prisma.articleStock.deleteMany({ where: { dateSortie: { not: null } } })
		]);

		return {
			succes: true as const,
			purge: 'historique' as const,
			consommationsSupprimees: consommationsSupprimees.count,
			articlesSupprimes: articlesSupprimes.count
		};
	},

	/**
	 * Tout supprimer : comme "Vider l'historique", mais y compris les
	 * articles encore en stock. Ne touche pas non plus à
	 * Produit/Categorie/Emplacement.
	 */
	toutSupprimer: async ({ request }) => {
		const donnees = await request.formData();
		if (!verifierConfirmation(donnees)) {
			return fail(400, { erreur: 'Confirmation incorrecte.', purge: 'tout' as const });
		}

		const [consommationsSupprimees, articlesSupprimes] = await prisma.$transaction([
			prisma.consommation.deleteMany(),
			prisma.articleStock.deleteMany()
		]);

		return {
			succes: true as const,
			purge: 'tout' as const,
			consommationsSupprimees: consommationsSupprimees.count,
			articlesSupprimes: articlesSupprimes.count
		};
	}
};
