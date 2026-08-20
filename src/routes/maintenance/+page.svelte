<script lang="ts">
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const CONFIRMATION_ATTENDUE = 'SUPPRIMER';

	let confirmationHistorique = $state('');
	let confirmationTout = $state('');

	const COMMANDE_SAUVEGARDE = `docker compose exec db pg_dump \\
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backup.sql`;
</script>

<svelte:head><title>Avancé — Stoguard</title></svelte:head>

<EnteteEcran titre="Avancé" retour="/parametres" libelleRetour="Retour aux réglages" />

<div class="sections">
	<div class="banniere banniere-avertissement">
		<p>Ces opérations sont irréversibles. Sauvegardez la base avant toute purge :</p>
		<pre>{COMMANDE_SAUVEGARDE}</pre>
		<p>Détails dans <code>DEPLOY.md</code>, à la racine du dépôt.</p>
	</div>

	{#if form?.succes}
		<p class="banniere confirmation">
			{#if form.purge === 'historique'}
				Historique vidé : {form.consommationsSupprimees} ligne{form.consommationsSupprimees > 1
					? 's'
					: ''} d'historique et {form.articlesSupprimes} article{form.articlesSupprimes > 1
					? 's'
					: ''} déjà sorti{form.articlesSupprimes > 1 ? 's' : ''} supprimés.
			{:else}
				Tout supprimé : {form.consommationsSupprimees} ligne{form.consommationsSupprimees > 1
					? 's'
					: ''} d'historique et {form.articlesSupprimes} article{form.articlesSupprimes > 1
					? 's'
					: ''} supprimés.
			{/if}
		</p>
	{/if}

	<section class="tuile">
		<h2>Articles sans délai après ouverture</h2>
		<p class="intro">
			Ces articles encore en stock ont une catégorie sans délai après ouverture configuré (ou
			aucune catégorie du tout) : s'ils sont ouverts un jour, leur date effective ne sera jamais
			plafonnée. Purement informatif.
		</p>

		{#if data.articlesSansDelai.length === 0}
			<p class="aucun">Aucun article concerné.</p>
		{:else}
			<ul class="liste">
				{#each data.articlesSansDelai as article (article.id)}
					<li>
						<a href="/article/{article.id}/modifier">
							{article.produit.marque
								? `${article.produit.nom} · ${article.produit.marque}`
								: article.produit.nom}
						</a>
						<span class="valeur">
							{article.produit.categorie ? article.produit.categorie.nom : 'Sans catégorie'}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section class="tuile">
		<h2>Vider l'historique</h2>
		<p class="intro">
			Supprime tout l'historique de consommation et les articles déjà sortis du stock (consommés
			ou jetés). Les articles encore en stock ne sont pas touchés, ni les produits, catégories et
			emplacements.
		</p>
		<p class="nombre">
			{data.totalConsommations} ligne{data.totalConsommations > 1 ? 's' : ''} d'historique et {data.articlesSortis}
			article{data.articlesSortis > 1 ? 's' : ''} déjà sorti{data.articlesSortis > 1 ? 's' : ''} seront
			supprimés.
		</p>

		<form method="POST" action="?/viderHistorique">
			<label for="confirmation-historique">
				Tapez <strong>{CONFIRMATION_ATTENDUE}</strong> pour confirmer
			</label>
			<input
				id="confirmation-historique"
				name="confirmation"
				class="champ"
				autocomplete="off"
				bind:value={confirmationHistorique}
				aria-invalid={form?.purge === 'historique' && !!form?.erreur}
			/>
			{#if form?.purge === 'historique' && form?.erreur}<p class="erreur">{form.erreur}</p>{/if}
			<button type="submit" class="danger" disabled={confirmationHistorique !== CONFIRMATION_ATTENDUE}>
				Vider l'historique
			</button>
		</form>
	</section>

	<section class="tuile">
		<h2>Tout supprimer</h2>
		<p class="intro">
			Supprime tout l'historique de consommation et TOUS les articles, y compris ceux encore en
			stock. Les produits, catégories et emplacements ne sont pas touchés.
		</p>
		<p class="nombre">
			{data.totalConsommations} ligne{data.totalConsommations > 1 ? 's' : ''} d'historique et {data.totalArticles}
			article{data.totalArticles > 1 ? 's' : ''} au total seront supprimés.
		</p>

		<form method="POST" action="?/toutSupprimer">
			<label for="confirmation-tout">
				Tapez <strong>{CONFIRMATION_ATTENDUE}</strong> pour confirmer
			</label>
			<input
				id="confirmation-tout"
				name="confirmation"
				class="champ"
				autocomplete="off"
				bind:value={confirmationTout}
				aria-invalid={form?.purge === 'tout' && !!form?.erreur}
			/>
			{#if form?.purge === 'tout' && form?.erreur}<p class="erreur">{form.erreur}</p>{/if}
			<button type="submit" class="danger" disabled={confirmationTout !== CONFIRMATION_ATTENDUE}>
				Tout supprimer
			</button>
		</form>
	</section>
</div>

<style>
	.sections {
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
		margin: 0 0 6px;
	}

	.intro {
		font-size: 11.5px;
		color: var(--texte-attenue);
		line-height: 1.5;
		margin: 0 0 8px;
	}

	.banniere p {
		margin: 0;
	}

	/* Bloc terminal : reste foncé dans les deux thèmes, il imite une console
	   et non une surface de l'interface. */
	.banniere pre + p {
		margin-top: 6px;
	}

	pre {
		background: #1a1d22;
		color: #f6f8fa;
		font-family: var(--police-mono);
		font-size: 10.5px;
		line-height: 1.5;
		border-radius: 8px;
		padding: 10px;
		margin: 8px 0;
		overflow-x: auto;
		white-space: pre;
	}

	code {
		font-family: var(--police-mono);
		font-size: 0.92em;
	}

	.confirmation {
		background: rgba(26, 127, 55, 0.14);
		border: 1px solid var(--succes-plein);
		color: var(--succes-plein);
	}

	.aucun {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--succes-plein);
		margin: 0;
	}

	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.liste li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		padding: 9px 0;
		border-top: 1px solid var(--puce-bordure);
		font-size: 13px;
	}

	.liste a {
		color: var(--accent-texte);
		text-decoration: none;
		font-weight: 600;
	}

	.valeur {
		font-size: 11.5px;
		color: var(--texte-attenue);
		white-space: nowrap;
	}

	.nombre {
		font-size: 12px;
		font-weight: 600;
		color: var(--avertissement-texte);
		margin: 0;
	}

	form {
		display: flex;
		flex-direction: column;
		margin-top: 12px;
	}

	label {
		font-size: 11px;
		font-weight: 600;
		color: var(--texte-attenue);
		margin-bottom: 5px;
	}

	.champ {
		font-size: 16px;
		padding: 10px 12px;
		border-radius: 10px;
	}

	.champ[aria-invalid='true'] {
		border-color: var(--danger-bordure);
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.8rem;
		margin: 0.4rem 0 0;
	}

	button.danger {
		margin-top: 12px;
		min-height: 48px;
		border-radius: 16px;
		border: 1px solid var(--danger-bordure);
		background: var(--danger-fond);
		color: var(--danger-texte);
		font-family: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}

	button.danger:disabled {
		border-color: var(--puce-bordure);
		background: var(--puce-fond);
		color: var(--texte-attenue);
		cursor: not-allowed;
	}
</style>
