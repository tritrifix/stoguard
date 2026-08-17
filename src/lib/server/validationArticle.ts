import { parseJour } from '$lib/dates';
import { prisma } from './db';

export type SaisieArticleCommune = {
	nom: string;
	emplacementId: string;
	quantite: string;
	dateImprimee: string;
	typeDate: string;
	categorieId: string;
	delaiOuverture: string;
};

export type ResultatValidationArticle = {
	erreurs: Record<string, string>;
	quantite: number;
	dateImprimee: Date;
	typeDate: 'DLC' | 'DDM';
	delaiOuverture: number | null;
};

/**
 * Validation partagée entre /ajouter et /article/[id]/modifier : les champs
 * communs aux deux formulaires suivent exactement les mêmes règles des deux
 * côtés. N'inclut pas les champs propres à un seul des deux formulaires
 * (dejaOuvert/dateOuverture/ean côté ajout, notes côté modification).
 *
 * Renvoie toujours un objet complet, y compris quand une valeur est
 * invalide (valeur de repli utilisée à sa place) : sans conséquence,
 * l'appelant doit de toute façon arrêter le traitement dès que erreurs
 * n'est pas vide plutôt que d'utiliser ces valeurs de repli.
 */
export async function validerChampsArticle(
	saisie: SaisieArticleCommune
): Promise<ResultatValidationArticle> {
	const erreurs: Record<string, string> = {};

	if (saisie.nom.trim() === '') {
		erreurs.nom = 'Le nom du produit est obligatoire.';
	}

	if (saisie.emplacementId === '') {
		erreurs.emplacementId = "L'emplacement est obligatoire.";
	} else {
		// La liste déroulante vient du serveur, mais un POST forgé peut
		// contenir n'importe quel identifiant.
		const emplacement = await prisma.emplacement.findUnique({
			where: { id: saisie.emplacementId },
			select: { id: true }
		});
		if (!emplacement) erreurs.emplacementId = 'Emplacement inconnu.';
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

	if (saisie.categorieId !== '') {
		const categorie = await prisma.categorie.findUnique({
			where: { id: saisie.categorieId },
			select: { id: true }
		});
		if (!categorie) erreurs.categorieId = 'Catégorie inconnue.';
	}

	// Optionnel : laisser vide retombe sur le délai de la catégorie (voir
	// dateEffective dans $lib/dates). Ce champ ne fait que surcharger cette
	// valeur pour cet exemplaire précis.
	let delaiOuverture: number | null = null;
	if (saisie.delaiOuverture.trim() !== '') {
		const valeur = Number(saisie.delaiOuverture);
		if (!Number.isInteger(valeur) || valeur < 0) {
			erreurs.delaiOuverture = 'Le délai doit être un nombre entier de jours, positif ou nul.';
		} else {
			delaiOuverture = valeur;
		}
	}

	return {
		erreurs,
		quantite,
		dateImprimee: dateImprimee ?? new Date(0),
		typeDate: saisie.typeDate === 'DDM' ? 'DDM' : 'DLC',
		delaiOuverture
	};
}
