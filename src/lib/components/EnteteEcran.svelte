<script lang="ts">
	import BasculeTheme from './BasculeTheme.svelte';

	let {
		titre,
		retour = '/',
		libelleRetour = 'Retour'
	}: { titre: string; retour?: string; libelleRetour?: string } = $props();
</script>

<header>
	<a class="retour" href={retour} aria-label={libelleRetour}>
		<svg width="10" height="16" viewBox="0 0 12 20" fill="none" aria-hidden="true">
			<path
				d="M10 2L2 10l8 8"
				stroke="currentColor"
				stroke-width="2.4"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</a>
	<h1>{titre}</h1>
	<BasculeTheme compact />
</header>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 0.85rem;
	}

	.retour {
		width: 40px;
		height: 40px;
		border-radius: 999px;
		background: var(--puce-fond);
		border: 1px solid var(--puce-bordure);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--texte);
	}

	h1 {
		flex: 1;
		min-width: 0;
		font-weight: 700;
		font-size: 17px;
		text-align: center;
		margin: 0;
	}
</style>
