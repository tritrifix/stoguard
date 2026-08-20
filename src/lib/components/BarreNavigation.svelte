<script lang="ts">
	import { page } from '$app/state';

	const chemin = $derived(page.url.pathname);
	const actif = (prefixe: string) =>
		prefixe === '/' ? chemin === '/' : chemin.startsWith(prefixe);
</script>

<nav class="barre" aria-label="Navigation principale">
	<a href="/" class="onglet" class:actif={actif('/')} aria-current={actif('/') ? 'page' : undefined}>
		<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1v-8z"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>Stock</span>
	</a>

	<a
		href="/historique"
		class="onglet"
		class:actif={actif('/historique')}
		aria-current={actif('/historique') ? 'page' : undefined}
	>
		<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.7" />
			<path
				d="M12 8v4l3 2"
				stroke="currentColor"
				stroke-width="1.7"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>Historique</span>
	</a>

	<a href="/scanner" class="scanner" aria-label="Scanner un code-barre">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="3" y="4" width="4" height="16" rx="1" stroke="#fff" stroke-width="1.8" />
			<rect x="9" y="4" width="2" height="16" rx="1" stroke="#fff" stroke-width="1.8" />
			<rect x="14" y="4" width="3" height="16" rx="1" stroke="#fff" stroke-width="1.8" />
			<rect x="19" y="4" width="2" height="16" rx="1" stroke="#fff" stroke-width="1.8" />
		</svg>
	</a>

	<a
		href="/parametres"
		class="onglet"
		class:actif={actif('/parametres')}
		aria-current={actif('/parametres') ? 'page' : undefined}
	>
		<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
			<circle cx="8" cy="7" r="1.6" fill="var(--fond-page)" stroke="currentColor" stroke-width="1.4" />
			<circle cx="15" cy="12" r="1.6" fill="var(--fond-page)" stroke="currentColor" stroke-width="1.4" />
			<circle cx="10" cy="17" r="1.6" fill="var(--fond-page)" stroke="currentColor" stroke-width="1.4" />
		</svg>
		<span>Réglages</span>
	</a>
</nav>

<style>
	.barre {
		position: fixed;
		bottom: 14px;
		left: 16px;
		right: 16px;
		max-width: 608px;
		margin: 0 auto;
		height: 64px;
		background: var(--nav-fond);
		backdrop-filter: blur(30px) saturate(200%);
		-webkit-backdrop-filter: blur(30px) saturate(200%);
		border: 1px solid var(--nav-bordure);
		border-radius: var(--rayon-pilule);
		box-shadow:
			inset 1px 1px 1px rgba(255, 255, 255, 0.35),
			var(--nav-ombre);
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding: 0 8px;
		z-index: 10;
	}

	.onglet {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		/* La barre est très translucide : sans ombre portée, les icônes
		   disparaissent sur un contenu clair qui défile dessous. */
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
		color: var(--nav-inactif);
		text-decoration: none;
		font-size: 10px;
		font-weight: 600;
		/* Cible tactile confortable malgré une barre de 64px. */
		min-width: 56px;
		min-height: 48px;
	}

	.onglet.actif {
		color: var(--accent);
		font-weight: 700;
	}

	.scanner {
		width: 52px;
		height: 52px;
		border-radius: 999px;
		background: rgba(193, 98, 45, 0.88);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: -24px;
		box-shadow: 0 8px 18px rgba(193, 98, 45, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.4);
		flex-shrink: 0;
	}
</style>
