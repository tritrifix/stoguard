import type { TypeDate } from '../../generated/prisma/enums.ts';

export type { TypeDate };

/** État temporel d'un article, indépendant du type de date. */
export type EtatArticle = 'PERIME' | 'URGENT' | 'BIENTOT' | 'OK';

/**
 * Sévérité d'affichage. Elle combine l'état temporel ET le type de date :
 * une DLC dépassée est un risque sanitaire ("danger"), une DDM dépassée est
 * une simple perte de qualité ("qualite") — le produit reste consommable.
 */
export type Severite = 'danger' | 'qualite' | 'urgent' | 'bientot' | 'ok';

/** Les seules données nécessaires au calcul : pas de dépendance à Prisma. */
export type ArticleDatable = {
	dateImprimee: Date;
	estOuvert: boolean;
	dateOuverture: Date | null;
	/** Surcharge de délai propre à l'article, en jours. */
	delaiOuverture: number | null;
	/** Délai par défaut de la catégorie du produit, en jours. */
	delaiCategorie: number | null;
};

// Une date de péremption est un JOUR, pas un instant. Tout est donc ancré à
// minuit UTC : sans cela, une saisie "14/08" enregistrée à minuit local depuis
// un poste en CEST devient "13/08 22:00" en base, et se relit comme le 13/08
// dans le conteneur (qui tourne en UTC) — un décalage d'un jour sur une DLC.

/** Minuit UTC du jour calendaire porté par cette date. */
export function debutJour(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Jour calendaire courant (tel que l'utilisateur le voit), à minuit UTC. */
export function aujourdhui(maintenant: Date = new Date()): Date {
	return new Date(
		Date.UTC(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())
	);
}

/** "2026-01-20" (valeur d'un <input type="date">) -> minuit UTC. */
export function parseJour(valeur: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
	const date = new Date(`${valeur}T00:00:00Z`);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Date -> "2026-01-20", pour préremplir un <input type="date">. */
export function versChampDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function ajouterJours(date: Date, jours: number): Date {
	const resultat = new Date(date);
	resultat.setUTCDate(resultat.getUTCDate() + jours);
	return resultat;
}

/**
 * Date à laquelle l'article doit réellement être consommé.
 *
 * Fermé  : la date imprimée fait foi.
 * Ouvert : min(dateImprimee, dateOuverture + délai), le délai venant de
 *          l'article s'il est renseigné, sinon de sa catégorie. Sans délai
 *          connu (ni l'un ni l'autre), l'ouverture n'avance rien.
 */
export function dateEffective(article: ArticleDatable): Date {
	if (!article.estOuvert || article.dateOuverture === null) {
		return article.dateImprimee;
	}

	const delai = article.delaiOuverture ?? article.delaiCategorie;
	if (delai === null) {
		return article.dateImprimee;
	}

	const limiteApresOuverture = ajouterJours(article.dateOuverture, delai);
	return limiteApresOuverture < article.dateImprimee
		? limiteApresOuverture
		: article.dateImprimee;
}

/**
 * Nombre de jours calendaires restants. On compare des jours, pas des
 * instants : un article qui expire aujourd'hui renvoie 0 quelle que soit
 * l'heure qu'il est.
 */
export function joursRestants(dateEffective: Date, maintenant: Date): number {
	const millisecondesParJour = 24 * 60 * 60 * 1000;
	const ecart = debutJour(dateEffective).getTime() - debutJour(maintenant).getTime();
	return Math.round(ecart / millisecondesParJour);
}

export function etatArticle(dateEffective: Date, maintenant: Date): EtatArticle {
	const jours = joursRestants(dateEffective, maintenant);
	if (jours < 0) return 'PERIME';
	if (jours <= 3) return 'URGENT';
	if (jours <= 7) return 'BIENTOT';
	return 'OK';
}

export function severite(etat: EtatArticle, typeDate: TypeDate): Severite {
	if (etat === 'PERIME') return typeDate === 'DLC' ? 'danger' : 'qualite';
	if (etat === 'URGENT') return 'urgent';
	if (etat === 'BIENTOT') return 'bientot';
	return 'ok';
}

export function libelleEtat(etat: EtatArticle, typeDate: TypeDate, jours: number): string {
	if (etat === 'PERIME') {
		const depuis = jours === -1 ? 'depuis 1 jour' : `depuis ${-jours} jours`;
		return typeDate === 'DLC' ? `Périmé ${depuis} — à jeter` : `Qualité dépassée ${depuis}`;
	}
	if (jours === 0) return "Dernier jour aujourd'hui";
	if (jours === 1) return 'Demain';
	return `Dans ${jours} jours`;
}
