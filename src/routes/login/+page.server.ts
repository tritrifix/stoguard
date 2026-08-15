import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { creerJeton, verifierMotDePasse } from '$lib/server/auth';
import { enregistrerEchec, reinitialiserLimite, verifierLimite } from '$lib/server/limiteConnexion';
import type { Actions, PageServerLoad } from './$types';

const DUREE_SESSION_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

/**
 * Ne renvoie que des chemins internes : une valeur comme
 * "https://evil.example/phish" ou "//evil.example" (URL relative au schéma)
 * serait une redirection ouverte si on la suivait telle quelle.
 */
function cheminInterne(valeur: string | null | undefined): string {
	if (!valeur || !valeur.startsWith('/') || valeur.startsWith('//')) return '/';
	return valeur;
}

export const load: PageServerLoad = ({ url, locals }) => {
	const redirectTo = cheminInterne(url.searchParams.get('redirectTo'));
	if (locals.authentifie) {
		redirect(303, redirectTo);
	}
	return { redirectTo };
};

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const donnees = await request.formData();
		const motDePasse = String(donnees.get('motDePasse') ?? '');
		const redirectTo = cheminInterne(String(donnees.get('redirectTo') ?? ''));

		const ip = getClientAddress();
		const attenteS = verifierLimite(ip);
		if (attenteS > 0) {
			return fail(429, {
				erreur: `Trop de tentatives. Réessayez dans ${attenteS} s.`,
				redirectTo
			});
		}

		if (!verifierMotDePasse(motDePasse, env.AUTH_PASSWORD_HASH)) {
			enregistrerEchec(ip);
			return fail(400, { erreur: 'Mot de passe incorrect.', redirectTo });
		}

		reinitialiserLimite(ip);

		const jeton = creerJeton(new Date(Date.now() + DUREE_SESSION_MS), env.SESSION_SECRET);
		cookies.set('session', jeton, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: DUREE_SESSION_MS / 1000
		});

		redirect(303, redirectTo);
	}
};
