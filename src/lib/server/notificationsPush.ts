import webpush from 'web-push';
import { env } from '$env/dynamic/private';
import { prisma } from './db';
import { aujourdhui, dateEffective, etatArticle } from '$lib/dates';
import { articlesAPreoccuper, construireMessageNotification } from '$lib/notifications';

const CONFIGURATION_ID = 'singleton';
const INTERVALLE_VERIFICATION_MS = 5 * 60 * 1000; // 5 minutes

let vapidConfigure = false;

/** Idempotent : configure web-push une seule fois, même appelée à chaque tick. */
function configurerVapid(): boolean {
	if (vapidConfigure) return true;
	if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return false;

	webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
	vapidConfigure = true;
	return true;
}

/**
 * Calcule les articles à signaler et envoie UNE notification groupée à
 * chaque abonnement enregistré. Silencieux (ne lève pas) si les clés VAPID
 * ne sont pas configurées ou si rien n'est à signaler : les notifications
 * sont une fonctionnalité optionnelle, leur absence de configuration ne
 * doit jamais faire échouer quoi que ce soit d'autre.
 */
export async function envoyerNotificationPeremption(): Promise<void> {
	if (!configurerVapid()) return;

	const abonnements = await prisma.abonnementPush.findMany();
	if (abonnements.length === 0) return;

	const articlesEnStock = await prisma.articleStock.findMany({
		where: { dateSortie: null },
		include: { produit: { include: { categorie: true } } }
	});

	const maintenant = aujourdhui();
	const lignes = articlesEnStock.map((article) => ({
		id: article.id,
		nom: article.produit.nom,
		etat: etatArticle(
			dateEffective({
				dateImprimee: article.dateImprimee,
				estOuvert: article.estOuvert,
				dateOuverture: article.dateOuverture,
				delaiOuverture: article.delaiOuverture,
				delaiCategorie: article.produit.categorie?.delaiApresOuverture ?? null
			}),
			maintenant
		)
	}));

	const message = construireMessageNotification(articlesAPreoccuper(lignes));
	if (!message) return;

	const payload = JSON.stringify(message);

	await Promise.all(
		abonnements.map(async (abonnement) => {
			try {
				await webpush.sendNotification(
					{
						endpoint: abonnement.endpoint,
						keys: { p256dh: abonnement.p256dh, auth: abonnement.auth }
					},
					payload
				);
			} catch (erreur) {
				// 404/410 : l'abonnement n'existe plus côté navigateur (app
				// désinstallée, permission retirée...). On le retire plutôt que
				// de retenter indéfiniment un envoi qui échouera toujours.
				const statut = (erreur as { statusCode?: number } | undefined)?.statusCode;
				if (statut === 404 || statut === 410) {
					await prisma.abonnementPush.delete({ where: { id: abonnement.id } }).catch(() => {});
				}
			}
		})
	);
}

async function verifierEtEnvoyer(): Promise<void> {
	if (!configurerVapid()) return;

	const configuration = await prisma.configuration.findUnique({ where: { id: CONFIGURATION_ID } });
	if (!configuration) return;

	const maintenant = new Date();
	// Heure locale du conteneur (TZ), pas UTC : c'est la même convention que
	// pour "aujourd'hui" ailleurs dans l'app.
	if (maintenant.getHours() < configuration.heureNotification) return;

	const dejaEnvoyeeAujourdhui =
		configuration.derniereNotificationEnvoyee !== null &&
		aujourdhui(configuration.derniereNotificationEnvoyee).getTime() === aujourdhui(maintenant).getTime();
	if (dejaEnvoyeeAujourdhui) return;

	await envoyerNotificationPeremption();

	await prisma.configuration.update({
		where: { id: CONFIGURATION_ID },
		data: { derniereNotificationEnvoyee: maintenant }
	});
}

const global_ = globalThis as unknown as { planificateurNotificationsDemarre?: boolean };

/**
 * Démarre le déclencheur quotidien. setInterval simple, pas de cron système
 * : le déploiement reste "git pull && docker compose up -d --build".
 *
 * Comportement au redémarrage du conteneur : le dernier envoi réussi est
 * persisté en base (Configuration.derniereNotificationEnvoyee), pas en
 * mémoire, donc un redémarrage ne cause jamais de double envoi le même
 * jour. La comparaison d'heure est en ">=" (pas "==="), donc un redémarrage
 * qui saute l'heure exacte (conteneur arrêté de 8h50 à 10h, par exemple)
 * envoie quand même au premier tick suivant plutôt que d'attendre le
 * lendemain — mieux vaut un rappel tardif qu'aucun. Protégé par un
 * indicateur sur globalThis : en dev, le rechargement à chaud de ce module
 * ne doit pas empiler plusieurs setInterval (même idiome que le cache du
 * client Prisma dans db.ts).
 */
export function demarrerPlanificateurNotifications(): void {
	if (global_.planificateurNotificationsDemarre) return;
	global_.planificateurNotificationsDemarre = true;

	setInterval(() => {
		verifierEtEnvoyer().catch((erreur) => {
			console.error('Échec de la vérification des notifications de péremption :', erreur);
		});
	}, INTERVALLE_VERIFICATION_MS);
}
