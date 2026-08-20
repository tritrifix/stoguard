import { browser } from '$app/environment';

export const CLE_THEME = 'stoguard:theme';

/**
 * État du thème, partagé par tous les écrans. La valeur de départ est lue
 * sur <html>, où le script anti-FOUC de src/app.html l'a déjà posée avant
 * le rendu : sans ça, l'app repartirait en clair à chaque navigation
 * complète avant de rebasculer en sombre.
 */
export const theme = $state({
	sombre: browser && document.documentElement.dataset.theme === 'dark'
});

export function basculerTheme() {
	theme.sombre = !theme.sombre;

	if (theme.sombre) {
		document.documentElement.dataset.theme = 'dark';
	} else {
		delete document.documentElement.dataset.theme;
	}

	try {
		localStorage.setItem(CLE_THEME, theme.sombre ? 'dark' : 'light');
	} catch {
		// Navigation privée ou stockage refusé : le thème reste appliqué
		// pour la session, il ne sera simplement pas retenu.
	}
}
