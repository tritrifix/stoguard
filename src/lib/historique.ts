/**
 * Regroupement de l'historique par jour.
 *
 * Attention : contrairement aux dates de péremption (jours calendaires
 * ancrés à minuit UTC, voir $lib/dates), Consommation.date est un instant
 * réel. Le jour d'appartenance est donc le jour *local* de l'utilisateur —
 * une sortie enregistrée à 23h30 appartient bien à ce jour-là pour lui,
 * même si elle tombe le lendemain en UTC.
 */

export type LigneDatee = { date: Date };

export type GroupeJour<T extends LigneDatee> = {
	/** Identifiant stable du jour local, au format AAAA-MM-JJ. */
	cle: string;
	/** Position par rapport à aujourd'hui, pour les libellés relatifs. */
	relatif: 'aujourdhui' | 'hier' | null;
	/** Date représentative du groupe, pour un formatage littéral. */
	jour: Date;
	lignes: T[];
};

/** Minuit local du jour auquel appartient cet instant. */
export function debutJourLocal(instant: Date): Date {
	return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
}

export function cleJourLocal(instant: Date): string {
	const mois = String(instant.getMonth() + 1).padStart(2, '0');
	const jour = String(instant.getDate()).padStart(2, '0');
	return `${instant.getFullYear()}-${mois}-${jour}`;
}

/**
 * Regroupe des lignes déjà triées de la plus récente à la plus ancienne.
 * L'ordre d'entrée est conservé : aucun tri n'est refait ici, le serveur
 * ordonne déjà par date décroissante.
 */
export function grouperParJour<T extends LigneDatee>(
	lignes: T[],
	maintenant: Date
): GroupeJour<T>[] {
	const cleAujourdhui = cleJourLocal(maintenant);

	const veille = debutJourLocal(maintenant);
	veille.setDate(veille.getDate() - 1);
	const cleHier = cleJourLocal(veille);

	const groupes: GroupeJour<T>[] = [];

	for (const ligne of lignes) {
		const cle = cleJourLocal(ligne.date);
		const dernier = groupes[groupes.length - 1];

		if (dernier && dernier.cle === cle) {
			dernier.lignes.push(ligne);
			continue;
		}

		groupes.push({
			cle,
			relatif: cle === cleAujourdhui ? 'aujourdhui' : cle === cleHier ? 'hier' : null,
			jour: debutJourLocal(ligne.date),
			lignes: [ligne]
		});
	}

	return groupes;
}
