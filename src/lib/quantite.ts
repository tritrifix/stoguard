// Arithmétique de quantité pour les sorties de stock (Consommé / Jeté).
// Utilise Prisma.Decimal (decimal.js) plutôt que des number JavaScript :
// mélanger flottant et Decimal sur des quantités type 0.1 accumulerait des
// erreurs d'arrondi (3 - 1 - 1 - 1 pourrait laisser un résidu du type
// 0.0000000000000004 au lieu de 0 exact).
import { Prisma } from '../../generated/prisma/client.ts';

export type ResultatSortiePartielle = {
	nouvelleQuantite: Prisma.Decimal;
	articleEpuise: boolean;
};

/**
 * Calcule ce qu'il reste après une sortie partielle (Consommé ou Jeté) d'une
 * quantité inférieure ou égale au stock. N'accède ni au réseau ni à la base
 * : c'est ce qui la rend testable indépendamment de Prisma/la base.
 *
 * Renvoie null si la quantité sortie n'est pas strictement positive, ou si
 * elle dépasse ce qu'il reste — à l'appelant de traduire ça en erreur de
 * validation plutôt que de laisser passer une quantité négative en base.
 */
export function calculerSortiePartielle(
	quantiteActuelle: string | number | Prisma.Decimal,
	quantiteSortie: string | number | Prisma.Decimal
): ResultatSortiePartielle | null {
	const actuelle = new Prisma.Decimal(quantiteActuelle);
	const sortie = new Prisma.Decimal(quantiteSortie);

	if (sortie.lessThanOrEqualTo(0) || sortie.greaterThan(actuelle)) return null;

	const nouvelleQuantite = actuelle.minus(sortie);

	return {
		nouvelleQuantite,
		articleEpuise: nouvelleQuantite.isZero()
	};
}

export type ResultatRestauration = {
	nouvelleQuantite: Prisma.Decimal;
};

/**
 * Calcule la quantité après annulation d'une sortie (Consommé ou Jeté) :
 * simple addition, mais en Decimal plutôt qu'en number JavaScript, pour la
 * même raison que calculerSortiePartielle. Toujours possible (contrairement
 * à une sortie, il n'y a pas de plafond à restaurer) : ne renvoie jamais
 * null.
 */
export function calculerRestauration(
	quantiteActuelle: string | number | Prisma.Decimal,
	quantiteARestaurer: string | number | Prisma.Decimal
): ResultatRestauration {
	const actuelle = new Prisma.Decimal(quantiteActuelle);
	const aRestaurer = new Prisma.Decimal(quantiteARestaurer);

	return { nouvelleQuantite: actuelle.plus(aRestaurer) };
}
