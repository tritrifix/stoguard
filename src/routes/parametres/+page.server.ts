import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import { hacherMotDePasse, verifierMotDePasse } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

const CONFIGURATION_ID = 'singleton';
const LONGUEUR_MIN = 8;

export const load: PageServerLoad = async () => {
	const configuration = await prisma.configuration.findUnique({ where: { id: CONFIGURATION_ID } });

	return {
		// La clé publique VAPID n'est pas un secret (elle est par nature
		// transmise au navigateur pour créer l'abonnement Push) : sûr de
		// l'exposer au client via les données de la page.
		vapidPublicKey: env.VAPID_PUBLIC_KEY ?? '',
		notificationsConfigurees: Boolean(
			env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT
		),
		heureNotification: configuration?.heureNotification ?? 9
	};
};

export const actions: Actions = {
	changerMotDePasse: async ({ request, cookies }) => {
		const donnees = await request.formData();
		const motDePasseActuel = String(donnees.get('motDePasseActuel') ?? '');
		const nouveauMotDePasse = String(donnees.get('nouveauMotDePasse') ?? '');
		const confirmation = String(donnees.get('confirmation') ?? '');

		const configuration = await prisma.configuration.findUnique({
			where: { id: CONFIGURATION_ID }
		});

		// Obligatoire et vérifié en premier, avant tout le reste : sans ça,
		// quelqu'un qui trouve une session ouverte pourrait changer le mot de
		// passe et verrouiller le propriétaire hors de sa propre application.
		if (!configuration || !verifierMotDePasse(motDePasseActuel, configuration.motDePasseHash)) {
			return fail(400, { erreur: 'Mot de passe actuel incorrect.' });
		}

		if (nouveauMotDePasse.length < LONGUEUR_MIN) {
			return fail(400, {
				erreur: `Le nouveau mot de passe doit faire au moins ${LONGUEUR_MIN} caractères.`
			});
		}

		if (nouveauMotDePasse !== confirmation) {
			return fail(400, { erreur: 'Les deux nouveaux mots de passe ne correspondent pas.' });
		}

		const nouveauHash = hacherMotDePasse(nouveauMotDePasse);

		await prisma.configuration.update({
			where: { id: CONFIGURATION_ID },
			// L'incrément de versionSession invalide toutes les sessions
			// existantes d'un coup (voir verifierJeton) : c'est le mécanisme
			// de révocation, il n'y a pas de liste de jetons à tenir à jour.
			data: { motDePasseHash: nouveauHash, versionSession: { increment: 1 } }
		});

		// Le cookie actuel est désormais rejeté par verifierJeton (version
		// différente), mais le supprimer évite un aller-retour serveur inutile
		// au prochain chargement : la page suivante sait déjà qu'il n'y a plus
		// de session.
		cookies.delete('session', { path: '/' });

		redirect(303, '/login?motDePasseChange=1');
	},

	activerNotifications: async ({ request }) => {
		const donnees = await request.formData();
		const endpoint = String(donnees.get('endpoint') ?? '');
		const p256dh = String(donnees.get('p256dh') ?? '');
		const auth = String(donnees.get('auth') ?? '');

		if (!endpoint || !p256dh || !auth) {
			return fail(400, { erreurNotifications: 'Abonnement incomplet.' });
		}

		// upsert : le même navigateur peut se réabonner (permission retirée
		// puis rendue, par exemple) sans dupliquer la ligne — endpoint est
		// unique.
		await prisma.abonnementPush.upsert({
			where: { endpoint },
			create: { endpoint, p256dh, auth },
			update: { p256dh, auth }
		});

		return { succesNotifications: true };
	},

	desactiverNotifications: async ({ request }) => {
		const donnees = await request.formData();
		const endpoint = String(donnees.get('endpoint') ?? '');
		if (endpoint) {
			await prisma.abonnementPush.deleteMany({ where: { endpoint } });
		}
		return { succesNotifications: true };
	},

	changerHeureNotification: async ({ request }) => {
		const donnees = await request.formData();
		const heure = Number(donnees.get('heureNotification'));

		if (!Number.isInteger(heure) || heure < 0 || heure > 23) {
			return fail(400, { erreurHeure: 'Doit être une heure entière entre 0 et 23.' });
		}

		await prisma.configuration.update({
			where: { id: CONFIGURATION_ID },
			data: { heureNotification: heure }
		});

		return { succesHeure: true, heureNotification: heure };
	}
};
