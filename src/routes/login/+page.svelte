<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Connexion — Stoguard</title></svelte:head>

<div class="connexion">
	<h1>Stoguard</h1>

	<form method="POST">
		<input type="hidden" name="redirectTo" value={form?.redirectTo ?? data.redirectTo} />

		<label for="motDePasse">Mot de passe</label>
		<input
			id="motDePasse"
			name="motDePasse"
			type="password"
			autocomplete="current-password"
			required
			aria-invalid={!!form?.erreur}
		/>
		{#if form?.erreur}<p class="erreur">{form.erreur}</p>{/if}

		<button type="submit">Se connecter</button>
	</form>
</div>

<style>
	.connexion {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 3rem;
	}

	h1 {
		font-size: 1.4rem;
		margin: 0 0 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 320px;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #24292f;
		margin-bottom: 0.3rem;
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
		margin: 0.4rem 0 0;
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
