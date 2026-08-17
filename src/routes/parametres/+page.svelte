<script lang="ts">
	import { onMount } from 'svelte';
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

<svelte:head><title>Paramètres — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Paramètres</h1>
</header>

<section class="bloc">
	<h2>Changer le mot de passe</h2>
	<p>
		Change le mot de passe de connexion à l'application. Déconnecte
		immédiatement toutes les sessions ouvertes, y compris celle-ci — une
		reconnexion sera nécessaire juste après.
	</p>

	<form method="POST" action="?/changerMotDePasse">
		<label for="motDePasseActuel">Mot de passe actuel *</label>
		<input
			id="motDePasseActuel"
			name="motDePasseActuel"
			type="password"
			autocomplete="current-password"
			required
			aria-invalid={!!form?.erreur}
		/>

		<label for="nouveauMotDePasse">Nouveau mot de passe *</label>
		<input
			id="nouveauMotDePasse"
			name="nouveauMotDePasse"
			type="password"
			autocomplete="new-password"
			minlength="8"
			required
		/>

		<label for="confirmation">Confirmer le nouveau mot de passe *</label>
		<input
			id="confirmation"
			name="confirmation"
			type="password"
			autocomplete="new-password"
			minlength="8"
			required
		/>

		{#if form?.erreur}<p class="erreur">{form.erreur}</p>{/if}

		<button type="submit">Changer le mot de passe</button>
	</form>
</section>

<section class="bloc">
	<h2>Notifications de péremption</h2>

	{#if !data.notificationsConfigurees}
		<p>
			Non configurées côté serveur : clés VAPID absentes. Voir
			<code>npm run vapid:generate</code> et le fichier <code>.env</code>.
		</p>
	{:else if etatNotifications === 'non-supporte'}
		<p>Ce navigateur ne prend pas en charge les notifications push.</p>
	{:else}
		<p>
			Une notification groupée chaque jour pour les produits périmés ou à
			consommer sous 3 jours — jamais une par produit.
		</p>

		{#if etatNotifications === 'actif'}
			<button type="button" onclick={desactiverNotifications}>
				Désactiver les notifications
			</button>
		{:else}
			<button type="button" onclick={activerNotifications}>
				Activer les notifications
			</button>
		{/if}

		{#if etatNotifications === 'refuse'}
			<p class="erreur">
				Permission refusée. Autorise les notifications pour ce site dans les
				réglages du navigateur pour les activer.
			</p>
		{:else if etatNotifications === 'erreur'}
			<p class="erreur">Échec de l'activation. Réessaie plus tard.</p>
		{/if}

		<form
			method="POST"
			action="?/changerHeureNotification"
			class="heure-notification"
		>
			<label for="heureNotification">Heure d'envoi (0-23, heure du serveur)</label>
			<input
				id="heureNotification"
				name="heureNotification"
				type="number"
				min="0"
				max="23"
				step="1"
				value={heureChoisie}
				oninput={(e) => (heureLocale = e.currentTarget.valueAsNumber)}
			/>
			{#if form?.erreurHeure}<p class="erreur">{form.erreurHeure}</p>{/if}
			<button type="submit" class="secondaire">Enregistrer l'heure</button>
		</form>
	{/if}
</section>

<style>
	header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.25rem;
		margin: 0;
	}

	.retour {
		color: #1f6feb;
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	.bloc {
		border: 1px solid #d0d7de;
		border-radius: 10px;
		padding: 1rem;
		background: #fff;
	}

	.bloc h2 {
		font-size: 1.05rem;
		margin: 0 0 0.5rem;
	}

	.bloc > p {
		margin: 0 0 0.5rem;
		font-size: 0.88rem;
		color: #57606a;
		line-height: 1.5;
	}

	form {
		display: flex;
		flex-direction: column;
		margin-top: 0.75rem;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #24292f;
		margin: 0.9rem 0 0.3rem;
	}

	label:first-of-type {
		margin-top: 0;
	}

	input {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		padding: 0.6rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #fff;
		width: 100%;
		box-sizing: border-box;
	}

	input[aria-invalid='true'] {
		border-color: #cf222e;
	}

	.erreur {
		color: #cf222e;
		font-size: 0.82rem;
		margin: 0.6rem 0 0;
	}

	button {
		margin-top: 1.25rem;
		min-height: 48px;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		background: #1f6feb;
		color: #fff;
		cursor: pointer;
	}

	button.secondaire {
		background: none;
		border: 1px solid #d0d7de;
		color: #24292f;
	}

	.heure-notification {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #d0d7de;
	}

	.heure-notification input {
		max-width: 100px;
	}
</style>
