import { prisma } from '$lib/server/db';
import type { MotifConsommation } from '../../../generated/prisma/enums.ts';
import type { PageServerLoad } from './$types';

const LIMITE = 100;
const MOTIFS_VALIDES = new Set(['CONSOMME', 'JETE_PERIME', 'JETE_AUTRE']);

export const load: PageServerLoad = async ({ url }) => {
	const motifParam = url.searchParams.get('motif');
	const motifFiltre = motifParam && MOTIFS_VALIDES.has(motifParam) ? (motifParam as MotifConsommation) : null;

	const where = motifFiltre ? { motif: motifFiltre } : {};

	// Le récapitulatif porte toujours sur tout l'historique, jamais sur le
	// filtre en cours : c'est un repère fixe ("qu'est-ce qu'on gaspille au
	// total"), pas une reformulation du nombre de lignes affichées.
	const [total, parMotif] = await Promise.all([
		prisma.consommation.count({ where }),
		prisma.consommation.groupBy({ by: ['motif'], _count: { _all: true } })
	]);

	const totalPages = Math.max(1, Math.ceil(total / LIMITE));
	const pageDemandee = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const page = Math.min(pageDemandee, totalPages);

	const consommations = await prisma.consommation.findMany({
		where,
		include: { articleStock: { include: { produit: true } } },
		orderBy: { date: 'desc' },
		skip: (page - 1) * LIMITE,
		take: LIMITE
	});

	const recapitulatif = {
		CONSOMME: parMotif.find((m) => m.motif === 'CONSOMME')?._count._all ?? 0,
		JETE_PERIME: parMotif.find((m) => m.motif === 'JETE_PERIME')?._count._all ?? 0,
		JETE_AUTRE: parMotif.find((m) => m.motif === 'JETE_AUTRE')?._count._all ?? 0
	};

	return {
		lignes: consommations.map((c) => ({
			id: c.id,
			nom: c.articleStock.produit.nom,
			marque: c.articleStock.produit.marque,
			// Decimal Prisma -> nombre simple, sérialisable vers le client.
			quantite: Number(c.quantite),
			date: c.date,
			motif: c.motif
		})),
		total,
		page,
		totalPages,
		motifFiltre,
		recapitulatif
	};
};
