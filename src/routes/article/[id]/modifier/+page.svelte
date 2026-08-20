<script lang="ts">
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import TypeDate from '$lib/components/TypeDate.svelte';
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

	const indiceDelai = $derived(
		categorieSelectionnee == null
			? 'Vide = aucun délai'
			: categorieSelectionnee.delaiApresOuverture != null
				? `Vide = ${categorieSelectionnee.delaiApresOuverture} j (délai de la catégorie)`
				: 'Cette catégorie n’a pas de délai par défaut'
	);
</script>

<svelte:head><title>Modifier {data.article.nom} — Stoguard</title></svelte:head>

<EnteteEcran titre="Modifier l'article" libelleRetour="Retour au stock" />

<form method="POST">
	<section class="tuile">
		<h2>Fiche produit</h2>
		<p class="sous-titre">Partagée avec tous les exemplaires de ce produit.</p>

		{#if data.article.nombreArticlesPartages > 1}
			<p class="banniere banniere-avertissement">
				Ce produit est utilisé par {data.article.nombreArticlesPartages} articles encore en
				stock. Modifier ces champs les affectera tous.
			</p>
		{/if}
		{#if data.article.produitIssuOpenFoodFacts}
			<p class="banniere banniere-avertissement">
				Cette fiche vient d'Open Food Facts. La modifier la marquera comme corrigée
				manuellement, pour qu'un futur scan ne l'écrase plus.
			</p>
		{/if}

		<label for="nom">Nom du produit *</label>
		<input
			id="nom"
			name="nom"
			class="champ"
			required
			value={saisie?.nom ?? data.article.nom}
			aria-invalid={!!erreurs.nom}
		/>
		{#if erreurs.nom}<p class="erreur">{erreurs.nom}</p>{/if}

		<label for="marque">Marque</label>
		<input
			id="marque"
			name="marque"
			class="champ"
			value={saisie?.marque ?? data.article.marque ?? ''}
		/>

		<div class="duo">
			<div>
				<label for="contenance">Contenance</label>
				<input
					id="contenance"
					name="contenance"
					class="champ"
					placeholder="500 g, 1 L…"
					value={saisie?.contenance ?? data.article.contenance ?? ''}
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
		<p class="note">
			Changer la catégorie change le délai après ouverture par défaut des exemplaires ouverts
			sans délai personnalisé.
		</p>
	</section>

	<section class="tuile">
		<h2>Cet exemplaire</h2>
		<p class="sous-titre">Ne concerne que cet article précis.</p>

		<div class="duo">
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
					value={saisie?.quantite ?? data.article.quantite}
					aria-invalid={!!erreurs.quantite}
				/>
			</div>
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
						<option
							value={emplacement.id}
							selected={emplacement.id === (saisie?.emplacementId ?? data.article.emplacementId)}
						>
							{emplacement.nom}
						</option>
					{/each}
				</select>
			</div>
		</div>
		{#if erreurs.quantite}<p class="erreur">{erreurs.quantite}</p>{/if}
		{#if erreurs.emplacementId}<p class="erreur">{erreurs.emplacementId}</p>{/if}

		<label for="dateImprimee">Date imprimée *</label>
		<input
			id="dateImprimee"
			name="dateImprimee"
			class="champ"
			type="date"
			required
			value={saisie?.dateImprimee ?? data.article.dateImprimee}
			aria-invalid={!!erreurs.dateImprimee}
		/>
		{#if erreurs.dateImprimee}<p class="erreur">{erreurs.dateImprimee}</p>{/if}

		<div class="bloc">
			<TypeDate valeur={saisie?.typeDate ?? data.article.typeDate} erreur={erreurs.typeDate} />
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
			value={saisie?.delaiOuverture ?? data.article.delaiOuverture ?? ''}
			aria-invalid={!!erreurs.delaiOuverture}
		/>
		{#if erreurs.delaiOuverture}<p class="erreur">{erreurs.delaiOuverture}</p>{/if}

		<label for="notes">Notes</label>
		<textarea id="notes" name="notes" class="champ" rows="3"
			>{saisie?.notes ?? data.article.notes ?? ''}</textarea
		>
	</section>

	{#if erreurs.global}<p class="erreur">{erreurs.global}</p>{/if}

	<button type="submit" class="bouton-principal">Enregistrer les modifications</button>
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
		margin: 0;
	}

	.sous-titre {
		font-size: 11.5px;
		color: var(--texte-attenue);
		margin: 1px 0 10px;
	}

	.banniere {
		font-size: 11px;
		padding: 8px 10px;
		border-radius: 10px;
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
		font-family: inherit;
	}

	.champ[aria-invalid='true'] {
		border-color: var(--danger-bordure);
	}

	textarea.champ {
		resize: vertical;
	}

	.note {
		font-size: 10.5px;
		color: var(--texte-attenue);
		margin: 5px 0 0;
		line-height: 1.5;
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.8rem;
		margin: 0.35rem 0 0;
	}
</style>
