<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const erreurs = $derived(form?.erreurs ?? {});
	const saisie = $derived(form?.saisie);

	// Même idiome qu'ailleurs dans l'app : état local nul tant que
	// l'utilisateur n'a pas changé la catégorie, pour afficher le délai
	// qu'elle apporterait y compris juste après un envoi refusé.
	let categorieChoisie = $state<string | null>(null);
	const categorieId = $derived(
		categorieChoisie ?? saisie?.categorieId ?? data.article.categorieId ?? ''
	);
	const categorieSelectionnee = $derived(data.categories.find((c) => c.id === categorieId));
</script>

<svelte:head><title>Modifier {data.article.nom} — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Modifier l'article</h1>
</header>

<form method="POST">
	<section class="groupe">
		<h2>Fiche produit</h2>
		<p class="sous-titre">Partagée avec tous les exemplaires de ce produit.</p>

		{#if data.article.nombreArticlesPartages > 1}
			<p class="avertissement">
				Ce produit est utilisé par {data.article.nombreArticlesPartages} articles encore en
				stock. Modifier ces champs les affectera tous.
			</p>
		{/if}
		{#if data.article.produitIssuOpenFoodFacts}
			<p class="avertissement">
				Cette fiche vient d'Open Food Facts. La modifier la marquera comme corrigée
				manuellement, pour qu'un futur scan ne l'écrase plus.
			</p>
		{/if}

		<label for="nom">Nom du produit *</label>
		<input
			id="nom"
			name="nom"
			required
			value={saisie?.nom ?? data.article.nom}
			aria-invalid={!!erreurs.nom}
		/>
		{#if erreurs.nom}<p class="erreur">{erreurs.nom}</p>{/if}

		<label for="marque">Marque</label>
		<input id="marque" name="marque" value={saisie?.marque ?? data.article.marque ?? ''} />

		<label for="contenance">Contenance</label>
		<input
			id="contenance"
			name="contenance"
			placeholder="500 g, 1 L…"
			value={saisie?.contenance ?? data.article.contenance ?? ''}
		/>

		<label for="categorieId">Catégorie</label>
		<select
			id="categorieId"
			name="categorieId"
			value={categorieId}
			onchange={(e) => (categorieChoisie = e.currentTarget.value)}
		>
			<option value="">— Aucune —</option>
			{#each data.categories as categorie (categorie.id)}
				<option value={categorie.id}>{categorie.nom}</option>
			{/each}
		</select>
		{#if erreurs.categorieId}<p class="erreur">{erreurs.categorieId}</p>{/if}
		<p class="info-categorie">
			Changer la catégorie change le délai après ouverture par défaut, donc la date
			effective des articles liés à ce produit qui sont ouverts sans délai personnalisé.
		</p>
	</section>

	<section class="groupe">
		<h2>Cet exemplaire</h2>
		<p class="sous-titre">Ne concerne que cet article précis.</p>

		<label for="quantite">Quantité *</label>
		<input
			id="quantite"
			name="quantite"
			type="number"
			step="0.001"
			min="0.001"
			required
			value={saisie?.quantite ?? data.article.quantite}
			aria-invalid={!!erreurs.quantite}
		/>
		{#if erreurs.quantite}<p class="erreur">{erreurs.quantite}</p>{/if}

		<label for="emplacementId">Emplacement *</label>
		<select id="emplacementId" name="emplacementId" required aria-invalid={!!erreurs.emplacementId}>
			<option value="">— Choisir —</option>
			{#each data.emplacements as emplacement (emplacement.id)}
				<option
					value={emplacement.id}
					selected={emplacement.id === (saisie?.emplacementId ?? data.article.emplacementId)}
				>
					{emplacement.nom}
				</option>
			{/each}
		</select>
		{#if erreurs.emplacementId}<p class="erreur">{erreurs.emplacementId}</p>{/if}

		<label for="dateImprimee">Date imprimée *</label>
		<input
			id="dateImprimee"
			name="dateImprimee"
			type="date"
			required
			value={saisie?.dateImprimee ?? data.article.dateImprimee}
			aria-invalid={!!erreurs.dateImprimee}
		/>
		{#if erreurs.dateImprimee}<p class="erreur">{erreurs.dateImprimee}</p>{/if}

		<fieldset>
			<legend>Type de date *</legend>
			<label class="radio">
				<input
					type="radio"
					name="typeDate"
					value="DLC"
					checked={(saisie?.typeDate ?? data.article.typeDate) === 'DLC'}
				/>
				<span><strong>DLC</strong> — à consommer jusqu'au (risque sanitaire)</span>
			</label>
			<label class="radio">
				<input
					type="radio"
					name="typeDate"
					value="DDM"
					checked={(saisie?.typeDate ?? data.article.typeDate) === 'DDM'}
				/>
				<span><strong>DDM</strong> — à consommer de préférence avant (qualité)</span>
			</label>
			{#if erreurs.typeDate}<p class="erreur">{erreurs.typeDate}</p>{/if}
		</fieldset>

		<label for="delaiOuverture">
			Délai après ouverture (jours) — laisser vide pour utiliser celui de la catégorie
		</label>
		<input
			id="delaiOuverture"
			name="delaiOuverture"
			type="number"
			step="1"
			min="0"
			inputmode="numeric"
			value={saisie?.delaiOuverture ?? data.article.delaiOuverture ?? ''}
			aria-invalid={!!erreurs.delaiOuverture}
		/>
		{#if erreurs.delaiOuverture}<p class="erreur">{erreurs.delaiOuverture}</p>{/if}
		{#if categorieSelectionnee}
			<p class="info-categorie">
				{#if categorieSelectionnee.delaiApresOuverture !== null}
					La catégorie « {categorieSelectionnee.nom} » propose {categorieSelectionnee.delaiApresOuverture}
					jour{categorieSelectionnee.delaiApresOuverture > 1 ? 's' : ''}.
				{:else}
					La catégorie « {categorieSelectionnee.nom} » n'a pas de délai par défaut.
				{/if}
			</p>
		{/if}

		<label for="notes">Notes</label>
		<textarea id="notes" name="notes" rows="3">{saisie?.notes ?? data.article.notes ?? ''}</textarea
		>
	</section>

	{#if erreurs.global}<p class="erreur">{erreurs.global}</p>{/if}

	<button type="submit">Enregistrer les modifications</button>
</form>

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
		color: var(--lien);
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	.groupe {
		border: 1px solid var(--bordure);
		border-radius: 10px;
		padding: 1rem;
		background: var(--surface);
		margin-bottom: 1rem;
	}

	.groupe h2 {
		font-size: 1.05rem;
		margin: 0;
	}

	.sous-titre {
		font-size: 0.8rem;
		color: var(--texte-attenue);
		margin: 0.15rem 0 0;
	}

	.avertissement {
		background: var(--avertissement-fond);
		border: 1px solid var(--avertissement-bordure);
		color: var(--avertissement-texte);
		border-radius: 8px;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		line-height: 1.4;
		margin: 0.75rem 0 0;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--texte);
		margin: 0.9rem 0 0.3rem;
	}

	input:not([type]),
	input[type='number'],
	input[type='date'],
	select,
	textarea {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		padding: 0.6rem;
		border: 1px solid var(--bordure);
		border-radius: 8px;
		background: var(--surface);
		width: 100%;
		box-sizing: border-box;
		font-family: inherit;
	}

	textarea {
		resize: vertical;
	}

	[aria-invalid='true'] {
		border-color: var(--erreur-texte);
	}

	fieldset {
		border: 1px solid var(--bordure);
		border-radius: 8px;
		margin: 1rem 0 0;
		padding: 0.5rem 0.75rem 0.75rem;
	}

	legend {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0 0.3rem;
	}

	.radio {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-weight: 400;
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}

	.radio input {
		width: 1.2rem;
		height: 1.2rem;
		margin: 0;
		flex-shrink: 0;
	}

	.erreur {
		color: var(--erreur-texte);
		font-size: 0.82rem;
		margin: 0.3rem 0 0;
	}

	.info-categorie {
		margin: 0.35rem 0 0;
		font-size: 0.8rem;
		color: var(--texte-attenue);
	}

	button {
		margin-top: 0.25rem;
		min-height: 48px;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		background: var(--action-plein);
		color: #fff;
		cursor: pointer;
	}
</style>
