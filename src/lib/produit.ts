/**
 * Décide si la catégorie d'un produit déjà existant doit être mise à jour
 * suite à un ajout (scan ou saisie manuelle) qui réutilise sa fiche. Pure et
 * sans effet de bord pour rester testable indépendamment de Prisma.
 *
 * Renvoie la nouvelle valeur à écrire, ou undefined si rien ne change (pour
 * ne jamais écraser une catégorie déjà correcte par un simple renvoi de la
 * même valeur, notamment quand le formulaire est préempli depuis le cache).
 */
export function categorieAMettreAJour(
	categorieExistante: string | null,
	categorieSoumise: string | null
): string | null | undefined {
	return categorieSoumise !== categorieExistante ? categorieSoumise : undefined;
}
