<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import BarreNavigation from '$lib/components/BarreNavigation.svelte';
	import { theme } from '$lib/theme.svelte';
	import '../app.css';

	let { children } = $props();

	// Pas de barre sur /login (aucune session) ni sur /scanner (viseur
	// occupant tout l'écran, la barre masquerait la zone de visée).
	const sansBarre = $derived(
		page.url.pathname === '/login' || page.url.pathname.startsWith('/scanner')
	);

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', { type: 'module' });
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta name="theme-color" content={theme.sombre ? '#0B0906' : '#FBF3EA'} />
</svelte:head>

<div class="blobs" aria-hidden="true">
	<span class="blob blob-1"></span>
	<span class="blob blob-2"></span>
	<span class="blob blob-3"></span>
</div>

<main class:avec-barre={!sansBarre}>
	{@render children()}
</main>

{#if !sansBarre}
	<BarreNavigation />
{/if}

<style>
	.blobs {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 0;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(60px);
		opacity: var(--blob-opacite);
	}

	.blob-1 {
		width: 260px;
		height: 260px;
		background: var(--blob-1);
		top: -70px;
		left: -50px;
	}

	.blob-2 {
		width: 220px;
		height: 220px;
		background: var(--blob-2);
		top: 220px;
		right: -70px;
	}

	.blob-3 {
		width: 220px;
		height: 220px;
		background: var(--blob-3);
		bottom: 120px;
		left: -40px;
		filter: blur(65px);
	}

	main {
		position: relative;
		z-index: 1;
		/* Mobile-first : pleine largeur sur téléphone, centré au-delà. */
		max-width: 640px;
		margin: 0 auto;
		padding: 1.25rem 0.75rem 2rem;
	}

	main.avec-barre {
		/* Dégage la barre flottante (64px + marge) sans la faire chevaucher
		   le dernier élément de la page. */
		padding-bottom: 6.5rem;
	}
</style>
