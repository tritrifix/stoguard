<script lang="ts">
	import { aujourdhui, versChampDate } from '$lib/dates';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const saisie = $derived(form?.saisie);
	const erreurs = $derived(form?.erreurs ?? {});

	// Priorité à ce que l'utilisateur a déjà tapé (réaffichage après une
	// erreur de validation), sinon au préremplissage issu du scan.
	const nomInitial = $derived(saisie?.nom ?? data.prefill?.nom ?? '');
	const marqueInitial = $derived(saisie?.marque ?? data.prefill?.marque ?? '');
	const contenanceInitial = $derived(saisie?.contenance ?? data.prefill?.contenance ?? '');
	const eanATransmettre = $derived(saisie?.ean ?? data.ean ?? '');

	// null tant que l'utilisateur n'a pas touché la case : on retombe alors sur
	// l'état renvoyé par le serveur, ce qui réaffiche le champ "date
	// d'ouverture" après un envoi refusé.
	let caseCochee = $state<boolean | null>(null);
	const dejaOuvert = $derived(caseCochee ?? saisie?.dejaOuvert ?? false);

	const dateDuJour = versChampDate(aujourdhui());
</script>

<svelte:head><title>Ajouter un article — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Ajouter un article</h1>
</header>

<form method="POST">
	<input type="hidden" name="ean" value={eanATransmettre} />

	{#if data.produitInconnu}
		<p class="info">
			Produit inconnu d'Open Food Facts, complète les informations. La fiche
			créée gardera le code-barre scanné : un prochain scan du même produit
			le retrouvera directement.
		</p>
	{/if}

	{#if data.prefill?.imageUrl}
		<img class="photo-produit" src={data.prefill.imageUrl} alt="" />
	{/if}

	<label for="nom">Nom du produit *</label>
	<input id="nom" name="nom" required value={nomInitial} aria-invalid={!!erreurs.nom} />
	{#if erreurs.nom}<p class="erreur">{erreurs.nom}</p>{/if}

	<label for="marque">Marque</label>
	<input id="marque" name="marque" value={marqueInitial} />

	<label for="contenance">Contenance</label>
	<input
		id="contenance"
		name="contenance"
		placeholder="500 g, 1 L…"
		value={contenanceInitial}
	/>

	<label for="categorieId">Catégorie</label>
	<select id="categorieId" name="categorieId">
		<option value="">— Aucune —</option>
		{#each data.categories as categorie (categorie.id)}
			<option value={categorie.id} selected={categorie.id === saisie?.categorieId}>
				{categorie.nom}
			</option>
		{/each}
	</select>
	{#if erreurs.categorieId}<p class="erreur">{erreurs.categorieId}</p>{/if}

	<label for="emplacementId">Emplacement *</label>
	<select id="emplacementId" name="emplacementId" required aria-invalid={!!erreurs.emplacementId}>
		<option value="">— Choisir —</option>
		{#each data.emplacements as emplacement (emplacement.id)}
			<option value={emplacement.id} selected={emplacement.id === saisie?.emplacementId}>
				{emplacement.nom}
			</option>
		{/each}
	</select>
	{#if erreurs.emplacementId}<p class="erreur">{erreurs.emplacementId}</p>{/if}

	<label for="quantite">Quantité *</label>
	<input
		id="quantite"
		name="quantite"
		type="number"
		step="0.001"
		min="0.001"
		required
		value={saisie?.quantite ?? '1'}
		aria-invalid={!!erreurs.quantite}
	/>
	{#if erreurs.quantite}<p class="erreur">{erreurs.quantite}</p>{/if}

	<label for="dateImprimee">Date imprimée *</label>
	<input
		id="dateImprimee"
		name="dateImprimee"
		type="date"
		required
		value={saisie?.dateImprimee ?? ''}
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
				checked={(saisie?.typeDate ?? 'DLC') === 'DLC'}
			/>
			<span><strong>DLC</strong> — à consommer jusqu'au (risque sanitaire)</span>
		</label>
		<label class="radio">
			<input type="radio" name="typeDate" value="DDM" checked={saisie?.typeDate === 'DDM'} />
			<span><strong>DDM</strong> — à consommer de préférence avant (qualité)</span>
		</label>
		{#if erreurs.typeDate}<p class="erreur">{erreurs.typeDate}</p>{/if}
	</fieldset>

	<label class="checkbox">
		<input
			type="checkbox"
			name="dejaOuvert"
			checked={dejaOuvert}
			onchange={(e) => (caseCochee = e.currentTarget.checked)}
		/>
		<span>Déjà ouvert</span>
	</label>

	{#if dejaOuvert}
		<label for="dateOuverture">Date d'ouverture *</label>
		<input
			id="dateOuverture"
			name="dateOuverture"
			type="date"
			max={dateDuJour}
			value={saisie?.dateOuverture ?? dateDuJour}
			aria-invalid={!!erreurs.dateOuverture}
		/>
		{#if erreurs.dateOuverture}<p class="erreur">{erreurs.dateOuverture}</p>{/if}
	{/if}

	<button type="submit">Ajouter au stock</button>
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
		color: #1f6feb;
		text-decoration: none;
		font-weight: 600;
		white-space: nowrap;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #24292f;
		margin: 0.9rem 0 0.3rem;
	}

	input:not([type]),
	input[type='number'],
	input[type='date'],
	select {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		padding: 0.6rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #fff;
		width: 100%;
		box-sizing: border-box;
	}

	[aria-invalid='true'] {
		border-color: #cf222e;
	}

	fieldset {
		border: 1px solid #d0d7de;
		border-radius: 8px;
		margin: 1rem 0 0;
		padding: 0.5rem 0.75rem 0.75rem;
	}

	legend {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0 0.3rem;
	}

	.radio,
	.checkbox {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-weight: 400;
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
	}

	.radio input,
	.checkbox input {
		width: 1.2rem;
		height: 1.2rem;
		margin: 0;
		flex-shrink: 0;
	}

	.checkbox {
		margin-top: 1rem;
	}

	.erreur {
		color: #cf222e;
		font-size: 0.82rem;
		margin: 0.3rem 0 0;
	}

	.info {
		background: #ddf4ff;
		color: #0969da;
		border-radius: 8px;
		padding: 0.7rem 0.85rem;
		font-size: 0.85rem;
		margin: 0 0 1rem;
	}

	.photo-produit {
		display: block;
		max-width: 140px;
		max-height: 140px;
		object-fit: contain;
		margin: 0 auto 1rem;
		border-radius: 8px;
	}

	button {
		margin-top: 1.5rem;
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
