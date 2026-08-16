<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', { type: 'module' });
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content="#1f6feb" />
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
