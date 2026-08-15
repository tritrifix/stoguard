<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f6f8fa;
		color: #24292f;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			sans-serif;
	}

	main {
		/* Mobile-first : pleine largeur sur téléphone, centré au-delà. */
		max-width: 640px;
		margin: 0 auto;
		padding: 1rem 0.75rem 3rem;
	}
</style>
