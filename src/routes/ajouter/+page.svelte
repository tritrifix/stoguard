<script lang="ts">
	import { aujourdhui, versChampDate } from '$lib/dates';
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import TypeDate from '$lib/components/TypeDate.svelte';
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

	// Même idiome : null tant que l'utilisateur n'a pas changé la catégorie,
	// pour afficher le délai qu'elle apporterait à côté du champ de
	// surcharge, y compris juste après un envoi refusé.
	let categorieChoisie = $state<string | null>(null);
	const categorieId = $derived(
		categorieChoisie ?? saisie?.categorieId ?? data.prefill?.categorieId ?? ''
	);
	const categorieSelectionnee = $derived(data.categories.find((c) => c.id === categorieId));

	const indiceDelai = $derived(
		categorieSelectionnee == null
			? 'Vide = aucun délai'
			: categorieSelectionnee.delaiApresOuverture != null
				? `Vide = ${categorieSelectionnee.delaiApresOuverture} j (délai de la catégorie)`
				: 'Cette catégorie n’a pas de délai par défaut'
	);

	const dateDuJour = versChampDate(aujourdhui());
</script>

<svelte:head><title>Ajouter un article — Stoguard</title></svelte:head>

<EnteteEcran titre="Ajouter un article" libelleRetour="Retour au stock" />

<form method="POST">
	<input type="hidden" name="ean" value={eanATransmettre} />

	{#if data.produitInconnu}
		<p class="banniere banniere-info avec-icone">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
				<path d="M12 8h.01M12 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
			</svg>
			<span>
				Produit inconnu d'Open Food Facts, complète les informations. La fiche créée gardera ce
				code-barre : un prochain scan le retrouvera directement.
			</span>
		</p>
	{/if}

	<section class="tuile">
		<h2>Produit</h2>

		{#if data.prefill?.imageUrl}
			<div class="photo">
				<img src={data.prefill.imageUrl} alt="" loading="lazy" />
				<span>Photo reprise d'Open Food Facts</span>
			</div>
		{/if}

		<label for="nom">Nom du produit *</label>
		<input
			id="nom"
			name="nom"
			class="champ"
			required
			value={nomInitial}
			aria-invalid={!!erreurs.nom}
		/>
		{#if erreurs.nom}<p class="erreur">{erreurs.nom}</p>{/if}

		<label for="marque">Marque</label>
		<input id="marque" name="marque" class="champ" value={marqueInitial} />

		<div class="duo">
			<div>
				<label for="contenance">Contenance</label>
				<input
					id="contenance"
					name="contenance"
					class="champ"
					placeholder="500 g, 1 L…"
					value={contenanceInitial}
				/>
			</div>
			<div>
				<label for="categorieId">Catégorie</label>
				<select
					id="categorieId"
					name="categorieId"
					class="champ"
					value={categorieId}
					onchange={(e) => (categorieChoisie = e.currentTarget.value)}
				>
					<option value="">— Aucune —</option>
					{#each data.categories as categorie (categorie.id)}
						<option value={categorie.id}>{categorie.nom}</option>
					{/each}
				</select>
			</div>
		</div>
		{#if erreurs.categorieId}<p class="erreur">{erreurs.categorieId}</p>{/if}
	</section>

	<section class="tuile">
		<h2>Dates</h2>

		<label for="dateImprimee">Date imprimée *</label>
		<input
			id="dateImprimee"
			name="dateImprimee"
			class="champ"
			type="date"
			required
			value={saisie?.dateImprimee ?? ''}
			aria-invalid={!!erreurs.dateImprimee}
		/>
		{#if erreurs.dateImprimee}<p class="erreur">{erreurs.dateImprimee}</p>{/if}

		<div class="bloc">
			<TypeDate valeur={saisie?.typeDate ?? 'DLC'} erreur={erreurs.typeDate} />
		</div>

		<label for="delaiOuverture">Délai après ouverture (jours) — optionnel</label>
		<input
			id="delaiOuverture"
			name="delaiOuverture"
			class="champ"
			type="number"
			step="1"
			min="0"
			inputmode="numeric"
			placeholder={indiceDelai}
			value={saisie?.delaiOuverture ?? ''}
			aria-invalid={!!erreurs.delaiOuverture}
		/>
		{#if erreurs.delaiOuverture}<p class="erreur">{erreurs.delaiOuverture}</p>{/if}

		<label class="bascule-ligne">
			<span>Déjà ouvert</span>
			<input
				type="checkbox"
				name="dejaOuvert"
				checked={dejaOuvert}
				onchange={(e) => (caseCochee = e.currentTarget.checked)}
			/>
			<span class="rail" aria-hidden="true"><span class="pastille"></span></span>
		</label>

		{#if dejaOuvert}
			<label for="dateOuverture">Date d'ouverture *</label>
			<input
				id="dateOuverture"
				name="dateOuverture"
				class="champ"
				type="date"
				max={dateDuJour}
				value={saisie?.dateOuverture ?? dateDuJour}
				aria-invalid={!!erreurs.dateOuverture}
			/>
			{#if erreurs.dateOuverture}<p class="erreur">{erreurs.dateOuverture}</p>{/if}
		{/if}
	</section>

	<section class="tuile">
		<h2>Emplacement &amp; quantité</h2>
		<div class="duo">
			<div>
				<label for="emplacementId">Emplacement *</label>
				<select
					id="emplacementId"
					name="emplacementId"
					class="champ"
					required
					aria-invalid={!!erreurs.emplacementId}
				>
					<option value="">— Choisir —</option>
					{#each data.emplacements as emplacement (emplacement.id)}
						<option value={emplacement.id} selected={emplacement.id === saisie?.emplacementId}>
							{emplacement.nom}
						</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="quantite">Quantité *</label>
				<input
					id="quantite"
					name="quantite"
					class="champ"
					type="number"
					step="0.001"
					min="0.001"
					required
					value={saisie?.quantite ?? '1'}
					aria-invalid={!!erreurs.quantite}
				/>
			</div>
		</div>
		{#if erreurs.emplacementId}<p class="erreur">{erreurs.emplacementId}</p>{/if}
		{#if erreurs.quantite}<p class="erreur">{erreurs.quantite}</p>{/if}
	</section>

	<button type="submit" class="bouton-principal">Ajouter au stock</button>
</form>

<style>
	form {
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
		margin: 0 0 10px;
	}

	label {
		display: block;
		font-size: 11px;
		font-weight: 600;
		color: var(--texte-attenue);
		margin: 10px 0 5px;
	}

	.duo label {
		margin-top: 0;
	}

	/* Deux champs courts par rangée : en colonne unique, le formulaire
	   s'allongeait sans gagner en lisibilité. */
	.duo {
		display: flex;
		gap: 8px;
		margin-top: 10px;
	}

	.duo > div {
		flex: 1;
		min-width: 0;
	}

	.bloc {
		margin-top: 12px;
	}

	.champ {
		font-size: 16px;
		padding: 10px 12px;
		border-radius: 10px;
	}

	.champ[aria-invalid='true'] {
		border-color: var(--danger-bordure);
	}

	.photo {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}

	.photo img {
		width: 56px;
		height: 56px;
		border-radius: 12px;
		object-fit: contain;
		background: var(--vignette-fond);
		border: 1px solid var(--tuile-bordure);
		flex-shrink: 0;
	}

	.photo span {
		font-size: 11px;
		color: var(--texte-attenue);
	}

	.bascule-ligne {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		font-size: 13px;
		font-weight: 600;
		color: var(--texte);
		margin: 14px 0 0;
		cursor: pointer;
	}

	.bascule-ligne input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.rail {
		width: 40px;
		height: 22px;
		border-radius: 999px;
		background: var(--secondaire-fond);
		border: 1px solid var(--secondaire-bordure);
		padding: 2px;
		flex-shrink: 0;
		display: block;
		box-sizing: border-box;
	}

	.pastille {
		display: block;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		transform: translateX(0);
		transition: transform 0.2s;
	}

	.bascule-ligne input:checked ~ .rail {
		background: rgba(193, 98, 45, 0.75);
		border-color: transparent;
	}

	.bascule-ligne input:checked ~ .rail .pastille {
		transform: translateX(18px);
	}

	.bascule-ligne input:focus-visible ~ .rail {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.avec-icone {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		margin: 0;
	}

	.avec-icone svg {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.8rem;
		margin: 0.35rem 0 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.pastille {
			transition: none;
		}
	}
</style>
