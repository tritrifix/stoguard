import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { verifierJeton } from '$lib/server/auth';

// Fail-closed, vérifié une seule fois au démarrage du processus (pas à
// chaque requête) : sans ces deux secrets, soit l'app tournerait sans
// protection, soit n'importe qui pourrait forger un cookie de session valide
// sans jamais voir AUTH_PASSWORD_HASH. On préfère planter au démarrage.
// $env/dynamic/private (et non /static/) : cette valeur est lue à l'exécution,
// pas inlinée au build — sinon "docker compose build", où la variable n'est
// pas encore définie, casserait.
if (!env.AUTH_PASSWORD_HASH) {
	throw new Error(
		"AUTH_PASSWORD_HASH n'est pas défini. Générez-le avec `npm run auth:hash` et renseignez-le dans .env avant de démarrer l'application."
	);
}
if (!env.SESSION_SECRET) {
	throw new Error('SESSION_SECRET n\'est pas défini dans .env.');
}
// Simple courtoisie envers Open Food Facts (leur permettre de contacter
// l'auteur en cas d'usage anormal), pas une exigence de sécurité : on ne
// bloque pas le démarrage, juste un avertissement.
if (!env.OFF_CONTACT_EMAIL) {
	console.warn(
		"OFF_CONTACT_EMAIL n'est pas défini : Open Food Facts recevra un User-Agent avec une adresse de contact générique. Renseignez cette variable dans .env."
	);
}

const COOKIE_SESSION = 'session';

const CHEMINS_PUBLICS = new Set(['/login', '/health']);

// Le serveur adapter-node sert build/client (dont /_app/...) via un
// middleware statique placé AVANT le gestionnaire SvelteKit : ces requêtes
// n'atteignent donc déjà pas ce hook en pratique. On le déclare quand même
// explicitement — vérifié en conditions réelles que /login reste stylé pour
// un visiteur non authentifié (voir la page de connexion).
function estRessourceStatique(pathname: string): boolean {
	return pathname.startsWith('/_app/');
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	const jeton = event.cookies.get(COOKIE_SESSION);
	event.locals.authentifie = jeton !== undefined && verifierJeton(jeton, env.SESSION_SECRET);

	const estPublic = CHEMINS_PUBLICS.has(pathname) || estRessourceStatique(pathname);

	if (!estPublic && !event.locals.authentifie) {
		const demande = pathname + event.url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(demande)}`);
	}

	return resolve(event);
};
