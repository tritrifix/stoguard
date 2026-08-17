import type { EtatArticle } from './dates.ts';

export type ArticlePourNotification = { id: string; nom: string; etat: EtatArticle };

/**
 * Filtre les articles à signaler : dépassés (PERIME) ou à 3 jours ou moins
 * (URGENT). BIENTOT (jusqu'à 7 jours) en est volontairement exclu — la
 * notification quotidienne doit rester rare et actionnable, pas un rappel
 * pour tout ce qui approche.
 */
export function articlesAPreoccuper(
	lignes: ArticlePourNotification[]
): ArticlePourNotification[] {
	return lignes.filter((l) => l.etat === 'PERIME' || l.etat === 'URGENT');
}

export type MessageNotification = { titre: string; corps: string };

/**
 * Regroupe en UNE notification, jamais une par produit. Renvoie null s'il
 * n'y a rien à signaler : pas de notification vide envoyée.
 */
export function construireMessageNotification(
	articles: ArticlePourNotification[]
): MessageNotification | null {
	if (articles.length === 0) return null;

	const corps =
		articles.length === 1
			? `1 produit à consommer rapidement : ${articles[0].nom}`
			: `${articles.length} produits à consommer rapidement`;

	return { titre: 'Stoguard', corps };
}
