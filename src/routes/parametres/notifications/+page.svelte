<script lang="ts">
	import { onMount } from 'svelte';
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type EtatNotifications =
		| 'verification'
		| 'non-supporte'
		| 'inactif'
		| 'actif'
		| 'refuse'
		| 'erreur';

	let etatNotifications = $state<EtatNotifications>('verification');
	let heureLocale = $state<number | null>(null);
	const heureChoisie = $derived(heureLocale ?? data.heureNotification);

	function ajusterHeure(delta: number) {
		// Reste dans 0-23 sans repasser par le serveur : l'incrément boucle
		// plutôt que de se bloquer aux extrémités.
		heureLocale = (heureChoisie + delta + 24) % 24;
	}

	/** Le navigateur attend l'applicationServerKey en Uint8Array, la clé
	 * VAPID publique voyage en base64url : conversion nécessaire. */
	function urlBase64VersUint8Array(base64: string): Uint8Array {
		const complement = '='.repeat((4 - (base64.length % 4)) % 4);
		const base64Standard = (base64 + complement).replace(/-/g, '+').replace(/_/g, '/');
		const brut = atob(base64Standard);
		return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
	}

	async function verifierEtatAbonnement() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			etatNotifications = 'non-supporte';
			return;
		}
		const enregistrement = await navigator.serviceWorker.ready;
		const abonnement = await enregistrement.pushManager.getSubscription();
		etatNotifications = abonnement ? 'actif' : 'inactif';
	}

	onMount(verifierEtatAbonnement);

	async function activerNotifications() {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			etatNotifications = 'refuse';
			return;
		}

		try {
			const enregistrement = await navigator.serviceWorker.ready;
			const abonnement = await enregistrement.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64VersUint8Array(data.vapidPublicKey) as BufferSource
			});
			const json = abonnement.toJSON();

			const donnees = new FormData();
			donnees.set('endpoint', json.endpoint ?? '');
			donnees.set('p256dh', json.keys?.p256dh ?? '');
			donnees.set('auth', json.keys?.auth ?? '');
			await fetch('?/activerNotifications', { method: 'POST', body: donnees });

			etatNotifications = 'actif';
		} catch {
			etatNotifications = 'erreur';
		}
	}

	async function desactiverNotifications() {
		const enregistrement = await navigator.serviceWorker.ready;
		const abonnement = await enregistrement.pushManager.getSubscription();
		if (abonnement) {
			const endpoint = abonnement.endpoint;
			await abonnement.unsubscribe();
			const donnees = new FormData();
			donnees.set('endpoint', endpoint);
			await fetch('?/desactiverNotifications', { method: 'POST', body: donnees });
		}
		etatNotifications = 'inactif';
	}
</script>

<svelte:head><title>Notifications — Stoguard</title></svelte:head>

<EnteteEcran
	titre="Notifications de péremption"
	retour="/parametres"
	libelleRetour="Retour aux réglages"
/>

<div class="sections">
	<section class="tuile">
		<p class="intro">
			Une notification groupée chaque jour pour les produits périmés ou à consommer sous 3
			jours — jamais une par produit.
		</p>

		{#if !data.notificationsConfigurees}
			<p class="banniere banniere-avertissement">
				Non configurées côté serveur : clés VAPID absentes. Voir
				<code>npm run vapid:generate</code> et le fichier <code>.env</code>.
			</p>
		{:else if etatNotifications === 'non-supporte'}
			<p class="banniere banniere-avertissement">
				Ce navigateur ne prend pas en charge les notifications push.
			</p>
		{:else if etatNotifications === 'verification'}
			<p class="statut"><span class="point attente"></span> Vérification…</p>
		{:else if etatNotifications === 'actif'}
			<p class="statut"><span class="point actif"></span> Activées sur cet appareil</p>
			<button type="button" class="action danger" onclick={desactiverNotifications}>
				Désactiver les notifications
			</button>
		{:else}
			<p class="statut"><span class="point inactif"></span> Inactives sur cet appareil</p>
			<button type="button" class="bouton-principal" onclick={activerNotifications}>
				Activer les notifications
			</button>

			{#if etatNotifications === 'refuse'}
				<p class="banniere banniere-danger">
					Permission refusée. Autorise les notifications pour ce site dans les réglages du
					navigateur pour les activer.
				</p>
			{:else if etatNotifications === 'erreur'}
				<p class="banniere banniere-danger">Échec de l'activation. Réessaie plus tard.</p>
			{/if}
		{/if}
	</section>

	{#if data.notificationsConfigurees && etatNotifications !== 'non-supporte'}
		<section class="tuile">
			<h2>Heure d'envoi</h2>
			<p class="intro">0-23, heure du serveur.</p>

			<form method="POST" action="?/changerHeureNotification">
				<div class="stepper">
					<span class="heure">{String(heureChoisie).padStart(2, '0')} h</span>
					<div class="boutons">
						<button type="button" onclick={() => ajusterHeure(-1)} aria-label="Heure précédente">
							−
						</button>
						<button type="button" onclick={() => ajusterHeure(1)} aria-label="Heure suivante">
							+
						</button>
					</div>
				</div>
				<input type="hidden" name="heureNotification" value={heureChoisie} />

				{#if form?.erreurHeure}<p class="erreur">{form.erreurHeure}</p>{/if}
				{#if form?.succesHeure}<p class="succes">Heure enregistrée.</p>{/if}

				<button type="submit" class="action">Enregistrer l'heure</button>
			</form>
		</section>
	{/if}
</div>

<style>
	.sections {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.tuile {
		padding: 14px;
	}

	h2 {
		font-size: 13px;
		font-weight: 700;
		margin: 0 0 8px;
	}

	.intro {
		font-size: 11.5px;
		color: var(--texte-attenue);
		line-height: 1.5;
		margin: 0 0 12px;
	}

	.statut {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		margin: 0;
	}

	.point {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		flex-shrink: 0;
	}

	.actif {
		background: var(--succes-plein);
	}
	.inactif {
		background: var(--texte-attenue);
	}
	.attente {
		background: var(--avertissement-texte);
	}

	.action {
		width: 100%;
		min-height: 44px;
		border-radius: 12px;
		background: var(--puce-fond);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border: 1px solid var(--puce-bordure);
		color: var(--texte);
		font-family: inherit;
		font-size: 13.5px;
		font-weight: 700;
		cursor: pointer;
		margin-top: 12px;
	}

	.action.danger {
		color: var(--danger-texte);
	}

	.bouton-principal {
		width: 100%;
		margin-top: 12px;
	}

	.banniere {
		margin: 12px 0 0;
	}

	.banniere code {
		font-family: var(--police-mono);
		font-size: 0.92em;
	}

	.stepper {
		display: flex;
		align-items: center;
		justify-content: space-between;
		background: var(--champ-fond);
		border: 1px solid var(--champ-bordure);
		border-radius: 10px;
		padding: 10px 12px;
	}

	.heure {
		font-size: 15px;
		font-weight: 600;
		font-family: var(--police-mono);
	}

	.boutons {
		display: flex;
		gap: 6px;
	}

	.boutons button {
		width: 36px;
		height: 36px;
		border-radius: 9px;
		background: var(--puce-fond);
		border: 1px solid var(--puce-bordure);
		color: var(--texte);
		font-family: inherit;
		font-size: 17px;
		cursor: pointer;
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.8rem;
		margin: 0.5rem 0 0;
	}

	.succes {
		color: var(--succes-plein);
		font-size: 0.8rem;
		margin: 0.5rem 0 0;
	}
</style>
