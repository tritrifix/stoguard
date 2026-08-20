<script lang="ts">
	import { basculerTheme, theme } from '$lib/theme.svelte';

	// Les sous-écrans utilisent une version réduite (44×24) de l'interrupteur.
	let { compact = false }: { compact?: boolean } = $props();
</script>

<button
	type="button"
	class="bascule"
	class:compact
	onclick={basculerTheme}
	aria-pressed={theme.sombre}
	aria-label={theme.sombre ? 'Passer au thème clair' : 'Passer au thème sombre'}
>
	<span class="pastille">
		{#if theme.sombre}
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<path d="M21 12.5A8.5 8.5 0 1111.5 3 7 7 0 0021 12.5z" fill="#4A4D5E" />
			</svg>
		{:else}
			<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="5" fill="#E0972E" />
				<g stroke="#E0972E" stroke-width="2" stroke-linecap="round">
					<line x1="12" y1="2" x2="12" y2="5" />
					<line x1="12" y1="19" x2="12" y2="22" />
					<line x1="2" y1="12" x2="5" y2="12" />
					<line x1="19" y1="12" x2="22" y2="12" />
				</g>
			</svg>
		{/if}
	</span>
</button>

<style>
	.bascule {
		width: 52px;
		height: 28px;
		border-radius: 999px;
		background: var(--puce-fond);
		border: 1px solid var(--puce-bordure);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		padding: 2px;
		cursor: pointer;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.pastille {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		transform: translateX(0);
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
	}

	.bascule[aria-pressed='true'] .pastille {
		transform: translateX(24px);
	}

	.compact {
		width: 44px;
		height: 24px;
	}

	.compact .pastille {
		width: 20px;
		height: 20px;
	}

	.compact[aria-pressed='true'] .pastille {
		transform: translateX(20px);
	}

	@media (prefers-reduced-motion: reduce) {
		.pastille {
			transition: none;
		}
	}
</style>
