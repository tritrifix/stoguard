<script lang="ts">
	// Contrôle segmenté DLC/DDM, partagé par /ajouter et
	// /article/[id]/modifier. Repose sur de vrais boutons radio : le
	// formulaire reste soumissible sans JavaScript, l'apparence de segments
	// n'étant que de la mise en forme des étiquettes.
	let { valeur, erreur = undefined }: { valeur: string; erreur?: string } = $props();

	let infoOuverte = $state(false);
</script>

<div class="entete">
	<span class="intitule">Type de date *</span>
	<button
		type="button"
		class="info"
		onclick={() => (infoOuverte = !infoOuverte)}
		aria-expanded={infoOuverte}
		aria-label={infoOuverte ? "Masquer l'explication DLC et DDM" : 'Que signifient DLC et DDM ?'}
	>
		i
	</button>
</div>

<div class="segments">
	<label class="segment">
		<input type="radio" name="typeDate" value="DLC" checked={valeur !== 'DDM'} />
		<span>DLC</span>
	</label>
	<label class="segment">
		<input type="radio" name="typeDate" value="DDM" checked={valeur === 'DDM'} />
		<span>DDM</span>
	</label>
</div>

{#if erreur}<p class="erreur">{erreur}</p>{/if}

{#if infoOuverte}
	<div class="explication">
		<p>
			<strong>DLC</strong> — à consommer jusqu'au : une fois dépassée,
			<strong>risque sanitaire</strong>, le produit est à jeter.
		</p>
		<p>
			<strong>DDM</strong> — à consommer de préférence avant : une fois dépassée, simple perte
			de <strong>qualité</strong>, le produit reste consommable.
		</p>
	</div>
{/if}

<style>
	.entete {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.intitule {
		font-size: 12px;
		font-weight: 600;
		color: var(--texte-attenue);
	}

	.info {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: rgba(193, 98, 45, 0.18);
		border: 1px solid rgba(193, 98, 45, 0.4);
		color: var(--accent-texte);
		font-family: inherit;
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
		flex-shrink: 0;
	}

	.segments {
		display: flex;
		background: var(--champ-fond);
		border: 1px solid var(--champ-bordure);
		border-radius: 10px;
		padding: 4px;
		gap: 4px;
	}

	.segment {
		flex: 1;
	}

	/* Le radio reste focusable au clavier : masqué visuellement seulement. */
	.segment input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.segment span {
		display: block;
		text-align: center;
		padding: 9px 0;
		border-radius: 8px;
		color: var(--texte-attenue);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}

	.segment input:checked + span {
		background: rgba(193, 98, 45, 0.75);
		color: #fff;
		font-weight: 700;
	}

	.segment input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.explication {
		background: rgba(193, 98, 45, 0.1);
		border: 1px solid rgba(193, 98, 45, 0.25);
		border-radius: 10px;
		padding: 10px 12px;
		margin-top: 8px;
	}

	.explication p {
		font-size: 11.5px;
		line-height: 1.5;
		margin: 0;
	}

	.explication p + p {
		margin-top: 5px;
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.8rem;
		margin: 0.35rem 0 0;
	}
</style>
