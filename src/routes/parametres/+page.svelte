<script lang="ts">
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
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
</style>
