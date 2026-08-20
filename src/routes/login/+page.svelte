<script lang="ts">
	import BasculeTheme from '$lib/components/BasculeTheme.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Connexion — Stoguard</title></svelte:head>

<div class="coin-bascule"><BasculeTheme compact /></div>

<div class="connexion">
	<Logo />
	<h1>Stoguard</h1>
	<p class="accroche">Suivi du stock alimentaire</p>

	{#if data.motDePasseChange}
		<p class="info">Mot de passe changé : reconnecte-toi.</p>
	{/if}

	<form method="POST">
		<input type="hidden" name="redirectTo" value={form?.redirectTo ?? data.redirectTo} />

		{#if form?.erreur}
			<p class="erreur">
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
					<path d="M12 7.5v6M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
				{form.erreur}
			</p>
		{/if}

		<label for="motDePasse">Mot de passe</label>
		<input
			id="motDePasse"
			name="motDePasse"
			type="password"
			placeholder="••••••••"
			autocomplete="current-password"
			required
			aria-invalid={!!form?.erreur}
		/>

		<button type="submit" class="bouton-principal">Se connecter</button>
	</form>
</div>

<style>
	.coin-bascule {
		display: flex;
		justify-content: flex-end;
	}

	.connexion {
		display: flex;
		flex-direction: column;
		align-items: center;
		/* Centré verticalement sur l'écran, hors zone de la bascule. */
		min-height: 70vh;
		justify-content: center;
		padding: 0 1rem;
	}

	h1 {
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.2px;
		margin: 18px 0 2px;
	}

	.accroche {
		font-size: 12.5px;
		color: var(--texte-attenue);
		margin: 0 0 26px;
	}

	form {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 340px;
	}

	label {
		font-size: 12px;
		font-weight: 600;
		color: var(--texte-attenue);
		margin-bottom: 6px;
	}

	input {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		font-family: inherit;
		padding: 13px 14px;
		border: 1px solid var(--puce-bordure);
		border-radius: var(--rayon-champ);
		background: var(--puce-fond);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		color: var(--texte);
		width: 100%;
		box-sizing: border-box;
		margin-bottom: 18px;
	}

	input[aria-invalid='true'] {
		border: 1.5px solid var(--danger-bordure);
		box-shadow: 0 0 0 3px var(--danger-fond);
	}

	.erreur {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--danger-fond);
		border: 1px solid var(--danger-bordure);
		color: var(--danger-texte);
		border-radius: var(--rayon-champ);
		padding: 10px 12px;
		font-size: 12.5px;
		margin: 0 0 10px;
	}

	.erreur svg {
		flex-shrink: 0;
	}

	.info {
		width: 100%;
		max-width: 340px;
		box-sizing: border-box;
		background: rgba(193, 98, 45, 0.12);
		border: 1px solid rgba(193, 98, 45, 0.3);
		color: var(--accent-texte);
		border-radius: var(--rayon-champ);
		padding: 10px 12px;
		font-size: 12px;
		text-align: center;
		margin: 0 0 16px;
	}
</style>
