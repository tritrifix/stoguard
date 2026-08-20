<script lang="ts">
	// Reprend la coche de l'icône PWA (static/icons/icon-512.svg) plutôt que
	// d'introduire un second dessin à maintenir en parallèle.
	let { taille = 76 }: { taille?: number } = $props();
</script>

<div class="logo" style="width:{taille}px;height:{taille}px;border-radius:{Math.round(taille * 0.29)}px">
	<svg
		width={Math.round(taille * 0.5)}
		height={Math.round(taille * 0.5)}
		viewBox="0 0 512 512"
		fill="none"
		aria-hidden="true"
	>
		<path
			d="M128,270 L220,350 L390,170"
			stroke="#fff"
			stroke-width="52"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</div>

<style>
	.logo {
		background: linear-gradient(160deg, #d6733e, #c1622d);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 14px 28px rgba(193, 98, 45, 0.4);
		flex-shrink: 0;
	}
</style>
