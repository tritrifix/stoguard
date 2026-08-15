// Anti-force-brute simple, en mémoire, par IP. Suffisant pour une instance
// unique mono-utilisateur : pas de dépendance, pas de table en base.
//
// Limite connue : le compteur est perdu à chaque redémarrage du conteneur
// (déploiement d'une nouvelle version, redémarrage manuel...). Un
// attaquant qui provoque ou attend un redémarrage repart avec un compteur à
// zéro. Accepté ici vu le contexte (accès non exposé publiquement, un seul
// utilisateur légitime) ; à revoir si l'app devait un jour être multi-instance
// (le compteur n'est pas partagé entre instances) ou exposée plus largement.

type Entree = { echecs: number; bloqueJusqua: number };

const DELAI_MAX_S = 60;

const tentatives = new Map<string, Entree>();

export function verifierLimite(ip: string, maintenant: number = Date.now()): number {
	const entree = tentatives.get(ip);
	if (!entree) return 0;
	return Math.max(0, Math.ceil((entree.bloqueJusqua - maintenant) / 1000));
}

/** Délai progressif : 1 s, 2 s, 4 s... plafonné à DELAI_MAX_S. */
export function enregistrerEchec(ip: string, maintenant: number = Date.now()): void {
	const entree = tentatives.get(ip) ?? { echecs: 0, bloqueJusqua: 0 };
	entree.echecs += 1;
	const delaiS = Math.min(2 ** (entree.echecs - 1), DELAI_MAX_S);
	entree.bloqueJusqua = maintenant + delaiS * 1000;
	tentatives.set(ip, entree);
}

export function reinitialiserLimite(ip: string): void {
	tentatives.delete(ip);
}
