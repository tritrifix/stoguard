<script lang="ts">
	let {
		src = null,
		taille = 44
	}: { src?: string | null; taille?: number } = $props();

	// Une URL peut exister mais ne plus répondre (produit retiré d'Open Food
	// Facts) : on retombe alors sur le même repli neutre que l'absence
	// d'image, plutôt que sur l'icône d'image cassée du navigateur.
	let enEchec = $state(false);
</script>

{#if src && !enEchec}
	<img
		class="vignette"
		{src}
		alt=""
		loading="lazy"
		style="width:{taille}px;height:{taille}px"
		onerror={() => (enEchec = true)}
	/>
{:else}
	<div class="vignette vide" aria-hidden="true" style="width:{taille}px;height:{taille}px"></div>
{/if}

<style>
	.vignette {
		border-radius: 12px;
		flex-shrink: 0;
		object-fit: contain;
		background: var(--vignette-fond);
		border: 1px solid var(--tuile-bordure);
	}
</style>
