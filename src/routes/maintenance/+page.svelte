<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const CONFIRMATION_ATTENDUE = 'SUPPRIMER';

	let confirmationHistorique = $state('');
	let confirmationTout = $state('');
</script>

<svelte:head><title>Maintenance — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Maintenance</h1>
</header>

<p class="avertissement">
	Ces opérations sont irréversibles. Sauvegardez la base avant toute purge :
	<code>docker compose exec db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" &gt; backup.sql</code>
	— détails dans <code>DEPLOY.md</code>, à la racine du dépôt.
</p>

{#if form?.succes}
	<p class="confirmation">
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

<section class="rapport">
	<h2>Articles sans délai après ouverture</h2>
	<p>
		Ces articles encore en stock ont une catégorie sans délai après ouverture
		configuré (ou aucune catégorie du tout) : s'ils sont ouverts un jour, leur
		date effective ne sera jamais plafonnée. Purement informatif — corrigez
		la catégorie qui convient sur la fiche de l'article, si besoin.
	</p>

	{#if data.articlesSansDelai.length === 0}
		<p class="nombre ok">Aucun article concerné.</p>
	{:else}
		<ul class="liste-rapport">
			{#each data.articlesSansDelai as article (article.id)}
				<li>
					<a href="/article/{article.id}/modifier">
						{article.produit.nom}{#if article.produit.marque}
							<span class="marque"> — {article.produit.marque}</span>{/if}
					</a>
					<span class="categorie">
						{article.produit.categorie ? article.produit.categorie.nom : 'Sans catégorie'}
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="purge">
	<h2>Vider l'historique</h2>
	<p>
		Supprime tout l'historique de consommation et les articles déjà sortis du
		stock (consommés ou jetés). Les articles encore en stock ne sont pas
		touchés, ni les produits, catégories et emplacements.
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

<section class="purge">
	<h2>Tout supprimer</h2>
	<p>
		Supprime tout l'historique de consommation et TOUS les articles, y
		compris ceux encore en stock. Les produits, catégories et emplacements
		ne sont pas touchés.
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

	.avertissement {
		background: #fff8c5;
		border: 1px solid #d4a72c;
		border-radius: 10px;
		padding: 0.75rem;
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0 0 1.25rem;
	}

	.avertissement code {
		display: block;
		background: #24292f;
		color: #f6f8fa;
		border-radius: 6px;
		padding: 0.5rem;
		margin: 0.4rem 0;
		font-size: 0.78rem;
		overflow-x: auto;
		white-space: pre;
	}

	.confirmation {
		background: #dafbe1;
		border: 1px solid #1a7f37;
		color: #116329;
		border-radius: 10px;
		padding: 0.75rem;
		font-size: 0.9rem;
		margin: 0 0 1.25rem;
	}

	.rapport,
	.purge {
		border: 1px solid #d0d7de;
		border-radius: 10px;
		padding: 1rem;
		margin-bottom: 1.25rem;
		background: #fff;
	}

	.rapport h2,
	.purge h2 {
		font-size: 1.05rem;
		margin: 0 0 0.5rem;
	}

	.rapport p {
		margin: 0 0 0.5rem;
		font-size: 0.88rem;
		color: #57606a;
		line-height: 1.5;
	}

	.nombre.ok {
		font-weight: 600;
		color: #1a7f37 !important;
	}

	.liste-rapport {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.liste-rapport li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.75rem;
		padding: 0.5rem 0;
		border-top: 1px solid #eaeef2;
		font-size: 0.9rem;
	}

	.liste-rapport li:first-child {
		border-top: none;
	}

	.liste-rapport a {
		color: #1f6feb;
		text-decoration: none;
		font-weight: 600;
	}

	.liste-rapport .marque {
		color: #57606a;
		font-weight: 400;
	}

	.liste-rapport .categorie {
		color: #57606a;
		font-size: 0.82rem;
		white-space: nowrap;
	}

	.purge p {
		margin: 0 0 0.5rem;
		font-size: 0.88rem;
		color: #57606a;
		line-height: 1.5;
	}

	.nombre {
		font-weight: 600;
		color: #bc4c00 !important;
	}

	.purge form {
		display: flex;
		flex-direction: column;
		margin-top: 0.75rem;
	}

	.purge label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #24292f;
		margin-bottom: 0.3rem;
	}

	.purge input {
		/* 16px minimum : en dessous, Safari/Chrome Android zooment au focus. */
		font-size: 16px;
		padding: 0.6rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #fff;
		width: 100%;
		box-sizing: border-box;
	}

	.erreur {
		color: #cf222e;
		font-size: 0.82rem;
		margin: 0.4rem 0 0;
	}

	button.danger {
		margin-top: 0.75rem;
		min-height: 48px;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		background: #cf222e;
		color: #fff;
		cursor: pointer;
	}

	button.danger:disabled {
		background: #d0d7de;
		color: #8c959f;
		cursor: not-allowed;
	}
</style>
