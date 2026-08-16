import { redirect, type Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { verifierJeton } from '$lib/server/auth';

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

const CONFIGURATION_ID = 'singleton';

/**
 * Amorce la ligne Configuration au tout premier démarrage, à partir de
 * AUTH_PASSWORD_HASH : au-delà, la base devient la seule source de vérité
 * et modifier cette variable n'a plus aucun effet (voir /parametres).
 *
 * Le fail-closed devient nécessairement asynchrone (accès base de données),
 * donc il ne peut plus se faire en haut de fichier de façon purement
 * synchrone comme avant pour AUTH_PASSWORD_HASH. Il reste néanmoins effectif
 * grâce au "await" en haut de fichier plus bas : l'import de ce module —
 * donc le démarrage du serveur — reste bloqué tant que cette promesse n'est
 * pas résolue, et un rejet ici empêche "node build/index.js" d'atteindre
 * server.listen(), exactement comme le throw synchrone précédent. Vérifié
 * en conditions réelles (voir le commit).
 */
async function amorcerConfiguration() {
	const existante = await prisma.configuration.findUnique({ where: { id: CONFIGURATION_ID } });
	if (existante) return;

	if (!env.AUTH_PASSWORD_HASH) {
		throw new Error(
			"Aucune configuration en base et AUTH_PASSWORD_HASH n'est pas défini. Générez un hash avec `npm run auth:hash` et renseignez-le dans .env avant le premier démarrage."
		);
	}

	await prisma.configuration.create({
		data: { id: CONFIGURATION_ID, motDePasseHash: env.AUTH_PASSWORD_HASH }
	});
}

// $env/dynamic/private (et non /static/) : cette valeur est lue à
// l'exécution, pas inlinée au build — sinon "docker compose build", où la
// variable n'est pas encore définie, casserait.
await amorcerConfiguration();

const COOKIE_SESSION = 'session';

// /login reste protégé par le fail-closed ci-dessus (pas de page de
// connexion utilisable sans configuration), mais doit rester accessible une
// fois celle-ci amorcée, contrairement au reste de l'app. /health ignore
// volontairement la configuration : une sonde de santé doit pouvoir
// signaler que le processus répond même si la base a un problème.
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

	if (pathname === '/health' || estRessourceStatique(pathname)) {
		event.locals.authentifie = false;
		return resolve(event);
	}

	// Lu à chaque requête, jamais mis en cache en mémoire : la version de
	// session et le hash peuvent changer à tout moment (changement de mot de
	// passe), et une copie en mémoire deviendrait silencieusement périmée.
	const configuration = await prisma.configuration.findUnique({
		where: { id: CONFIGURATION_ID }
	});

	const jeton = event.cookies.get(COOKIE_SESSION);
	event.locals.authentifie =
		configuration !== null &&
		jeton !== undefined &&
		verifierJeton(jeton, env.SESSION_SECRET, configuration.versionSession);

	const estPublic = CHEMINS_PUBLICS.has(pathname);

	if (!estPublic && !event.locals.authentifie) {
		const demande = pathname + event.url.search;
		redirect(303, `/login?redirectTo=${encodeURIComponent(demande)}`);
	}

	return resolve(event);
};
