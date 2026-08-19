import { fail, redirect } from '@sveltejs/kit';
import { Prisma } from '../../generated/prisma/client.ts';
import { prisma } from '$lib/server/db';
import { aujourdhui, dateEffective, etatArticle, joursRestants, parseJour, severite } from '$lib/dates';
import { calculerSortiePartielle } from '$lib/quantite';
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
				imageUrl: article.produit.imageUrl,
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

/**
 * Sort tout ou partie d'un article du stock, en enregistrant le motif et la
 * quantité dans l'historique. quantiteSaisie n'est utilisée que si l'article
 * a plus d'une unité : à quantité 1, le champ n'est pas affiché côté client
 * (comportement inchangé, un clic = sortie complète), donc on sort tout sans
 * en tenir compte même si un contenu inattendu y traîne.
 */
async function sortirDuStock(
	articleId: string,
	motif: 'CONSOMME' | 'JETE_PERIME' | 'JETE_AUTRE',
	quantiteSaisie: string
) {
	const article = await prisma.articleStock.findUnique({
		where: { id: articleId },
		select: { quantite: true, dateSortie: true }
	});

	if (!article || article.dateSortie !== null) {
		return fail(404, { erreur: "Cet article n'est plus en stock." });
	}

	let quantiteSortie: Prisma.Decimal;
	if (article.quantite.equals(1)) {
		quantiteSortie = article.quantite;
	} else {
		const texte = quantiteSaisie.trim().replace(',', '.');
		try {
			quantiteSortie = new Prisma.Decimal(texte || '0');
		} catch {
			return fail(400, { erreur: 'Quantité invalide.' });
		}
	}

	const resultat = calculerSortiePartielle(article.quantite, quantiteSortie);
	if (resultat === null) {
		return fail(400, {
			erreur: 'Quantité invalide : doit être supérieure à zéro et ne peut pas dépasser ce qu’il reste.'
		});
	}

	await prisma.$transaction([
		prisma.consommation.create({
			data: { articleStockId: articleId, motif, quantite: quantiteSortie }
		}),
		prisma.articleStock.update({
			where: { id: articleId },
			data: resultat.articleEpuise
				? { quantite: resultat.nouvelleQuantite, dateSortie: new Date() }
				: { quantite: resultat.nouvelleQuantite }
		})
	]);
}

export const actions: Actions = {
	ouvrir: async ({ request }) => {
		const donnees = await request.formData();
		const id = String(donnees.get('id') ?? '');
		const dateSaisie = String(donnees.get('dateOuverture') ?? '').trim();

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

		// dateOuverture est un jour calendaire ancré à minuit UTC, pas un
		// instant (voir parseJour/aujourdhui dans $lib/dates.ts) : jamais une
		// date construite en heure locale, ça rouvrirait le décalage d'un jour
		// déjà corrigé ailleurs dans l'app.
		const aujourdhuiUtc = aujourdhui();
		let dateOuverture = aujourdhuiUtc;

		if (dateSaisie !== '') {
			const parsee = parseJour(dateSaisie);
			if (parsee === null) {
				return fail(400, { erreur: "Date d'ouverture invalide." });
			}
			if (parsee.getTime() > aujourdhuiUtc.getTime()) {
				return fail(400, {
					erreur: "La date d'ouverture ne peut pas être postérieure à aujourd'hui."
				});
			}
			dateOuverture = parsee;
		}

		await prisma.articleStock.update({
			where: { id },
			data: { estOuvert: true, dateOuverture }
		});

		return { succes: true };
	},

	annulerOuverture: async ({ request }) => {
		const donnees = await request.formData();
		const id = String(donnees.get('id') ?? '');

		const article = await prisma.articleStock.findUnique({
			where: { id },
			select: { estOuvert: true, dateSortie: true }
		});

		if (!article || article.dateSortie !== null) {
			return fail(404, { erreur: "Cet article n'est plus en stock." });
		}
		if (!article.estOuvert) {
			return { succes: true };
		}

		await prisma.articleStock.update({
			where: { id },
			data: { estOuvert: false, dateOuverture: null }
		});

		return { succes: true };
	},

	consommer: async ({ request }) => {
		const donnees = await request.formData();
		const echec = await sortirDuStock(
			String(donnees.get('id') ?? ''),
			'CONSOMME',
			String(donnees.get('quantite') ?? '')
		);
		return echec ?? { succes: true };
	},

	jeter: async ({ request }) => {
		const donnees = await request.formData();
		const motif = donnees.get('motif') === 'JETE_AUTRE' ? 'JETE_AUTRE' : 'JETE_PERIME';
		const echec = await sortirDuStock(
			String(donnees.get('id') ?? ''),
			motif,
			String(donnees.get('quantite') ?? '')
		);
		return echec ?? { succes: true };
	},

	deconnexion: async ({ cookies }) => {
		cookies.delete('session', { path: '/' });
		redirect(303, '/login');
	}
};
