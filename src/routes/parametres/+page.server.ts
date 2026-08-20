import { prisma } from '$lib/server/db';
import type { PageServerLoad } from './$types';

const APERCU_CATEGORIES = 3;

export const load: PageServerLoad = async () => {
	const [categories, nombreCategories, nombreEmplacements] = await Promise.all([
		// Aperçu seulement : les catégories qui portent effectivement un délai
		// sont les plus parlantes ici, une liste sans délai n'apprend rien.
		prisma.categorie.findMany({
			where: { delaiApresOuverture: { not: null } },
			orderBy: { delaiApresOuverture: 'asc' },
			take: APERCU_CATEGORIES
		}),
		prisma.categorie.count(),
		prisma.emplacement.count()
	]);

	return { categories, nombreCategories, nombreEmplacements };
};
