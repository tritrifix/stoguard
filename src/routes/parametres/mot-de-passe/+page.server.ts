import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { hacherMotDePasse, verifierMotDePasse } from '$lib/server/auth';
import type { Actions } from './$types';

const CONFIGURATION_ID = 'singleton';
const LONGUEUR_MIN = 8;

export const actions: Actions = {
	default: async ({ request, cookies }) => {
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
	}
};
