/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `stoguard-coquille-${version}`;

// Coquille applicative uniquement : le JS/CSS buildé (hashé, donc immuable
// tant que l'URL ne change pas) et les fichiers statiques (icônes,
// manifeste, favicon, robots.txt). JAMAIS les pages de l'app elles-mêmes :
// toutes affichent des données de stock qui doivent rester exactes, et
// /login ne doit jamais être servi périmé non plus. Une liste de stock mise
// en cache par erreur serait pire que pas de liste du tout — c'est une
// application dont tout l'intérêt est l'exactitude des dates.
const COQUILLE = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll([...COQUILLE]);
		})()
	);
	// Une nouvelle version déployée ne doit pas rester bloquée derrière un
	// ancien service worker tant que tous les onglets ne sont pas fermés.
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const noms = await caches.keys();
			await Promise.all(
				noms.filter((nom) => nom !== CACHE_NAME).map((nom) => caches.delete(nom))
			);
			// Prend le contrôle des onglets déjà ouverts immédiatement, sans
			// attendre un rechargement — le pendant côté client de skipWaiting.
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== sw.location.origin || !COQUILLE.has(url.pathname)) {
		// Tout le reste (pages de l'app, /login inclus, tout appel réseau
		// vers Open Food Facts ou ailleurs) : réseau uniquement, jamais
		// intercepté ni mis en cache. Le navigateur gère la requête comme en
		// l'absence de service worker.
		return;
	}

	// Coquille précachée : servie depuis le cache d'abord (rapide, et
	// correcte puisque ces fichiers sont hashés et donc immuables), réseau
	// en secours si jamais absente du cache.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			const enCache = await cache.match(event.request);
			return enCache ?? fetch(event.request);
		})()
	);
});
