<script lang="ts">
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Changer le mot de passe — Stoguard</title></svelte:head>

<EnteteEcran
	titre="Changer le mot de passe"
	retour="/parametres"
	libelleRetour="Retour aux réglages"
/>

<section class="tuile">
	<p class="banniere banniere-avertissement">
		Déconnecte immédiatement toutes les sessions ouvertes, y compris celle-ci — une reconnexion
		sera nécessaire juste après.
	</p>

	<form method="POST">
		<label for="motDePasseActuel">Mot de passe actuel *</label>
		<input
			id="motDePasseActuel"
			name="motDePasseActuel"
			class="champ"
			type="password"
			autocomplete="current-password"
			required
			aria-invalid={!!form?.erreur}
		/>
		{#if form?.erreur}
			<p class="erreur">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
					<path d="M12 7.5v6M12 16.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
				</svg>
				{form.erreur}
			</p>
		{/if}

		<label for="nouveauMotDePasse">Nouveau mot de passe *</label>
		<input
			id="nouveauMotDePasse"
			name="nouveauMotDePasse"
			class="champ"
			type="password"
			autocomplete="new-password"
			minlength="8"
			required
		/>
		<p class="indice">8 caractères minimum.</p>

		<label for="confirmation">Confirmer le nouveau mot de passe *</label>
		<input
			id="confirmation"
			name="confirmation"
			class="champ"
			type="password"
			autocomplete="new-password"
			minlength="8"
			required
		/>

		<button type="submit" class="bouton-principal">Changer le mot de passe</button>
	</form>
</section>

<style>
	.tuile {
		padding: 14px;
	}

	.banniere {
		margin: 0 0 4px;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	label {
		font-size: 11px;
		font-weight: 600;
		color: var(--texte-attenue);
		margin: 14px 0 5px;
	}

	.champ {
		font-size: 16px;
		padding: 10px 12px;
		border-radius: 10px;
	}

	.champ[aria-invalid='true'] {
		border: 1.5px solid var(--danger-bordure);
		box-shadow: 0 0 0 3px var(--danger-fond);
	}

	.indice {
		font-size: 11px;
		color: var(--texte-attenue);
		margin: 5px 0 0;
	}

	.erreur {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--danger-texte);
		font-size: 12.5px;
		margin: 8px 0 0;
	}

	.erreur svg {
		flex-shrink: 0;
	}

	button {
		margin-top: 18px;
	}
</style>
