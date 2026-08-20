import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { prisma } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

const CONFIGURATION_ID = 'singleton';

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
