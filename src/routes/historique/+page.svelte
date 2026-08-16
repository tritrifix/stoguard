<script lang="ts">
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Date + heure : Consommation.date est un véritable instant (contrairement
	// à dateImprimee/dateEffective, ancrées à minuit UTC comme jours
	// calendaires), donc formaté dans le fuseau local du navigateur, sans
	// forcer UTC.
	const formatDate = new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	function formatQuantite(q: number) {
		return Number.isInteger(q) ? String(q) : q.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
	}

	const LIBELLES = {
		CONSOMME: 'Consommé',
		JETE_PERIME: 'Jeté (périmé)',
		JETE_AUTRE: 'Jeté (autre motif)'
	} as const;

	function pageUrl(page: number): string {
		const params = new URLSearchParams();
		if (data.motifFiltre) params.set('motif', data.motifFiltre);
		if (page > 1) params.set('page', String(page));
		const requete = params.toString();
		return requete ? `?${requete}` : '?';
	}
</script>

<svelte:head><title>Historique — Stoguard</title></svelte:head>

<header>
	<a class="retour" href="/">← Stock</a>
	<h1>Historique</h1>
</header>

{#if form?.erreur}<p class="erreur">{form.erreur}</p>{/if}

<ul class="recap">
	<li class="recap-item recap-consomme">
		<span class="recap-nombre">{data.recapitulatif.CONSOMME}</span>
		<span class="recap-libelle">Consommés</span>
	</li>
	<li class="recap-item recap-perime">
		<span class="recap-nombre">{data.recapitulatif.JETE_PERIME}</span>
		<span class="recap-libelle">Jetés (périmés)</span>
	</li>
	<li class="recap-item recap-autre">
		<span class="recap-nombre">{data.recapitulatif.JETE_AUTRE}</span>
		<span class="recap-libelle">Jetés (autres)</span>
	</li>
</ul>

<form method="GET" class="filtre">
	<label for="motif">Motif</label>
	<select id="motif" name="motif" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		<option value="" selected={!data.motifFiltre}>Tous</option>
		<option value="CONSOMME" selected={data.motifFiltre === 'CONSOMME'}>Consommé</option>
		<option value="JETE_PERIME" selected={data.motifFiltre === 'JETE_PERIME'}>
			Jeté (périmé)
		</option>
		<option value="JETE_AUTRE" selected={data.motifFiltre === 'JETE_AUTRE'}>
			Jeté (autre motif)
		</option>
	</select>
	<noscript><button type="submit">Filtrer</button></noscript>
</form>

{#if data.total === 0}
	<p class="vide">Aucun historique pour l'instant : les articles consommés ou jetés apparaîtront ici.</p>
{:else if data.lignes.length === 0}
	<p class="vide">Aucune ligne pour ce filtre.</p>
{:else}
	<ul class="liste">
		{#each data.lignes as ligne (ligne.id)}
			<li class="ligne motif-{ligne.motif}">
				<div class="ligne-principale">
					<span class="pastille" aria-hidden="true">
						{#if ligne.motif === 'CONSOMME'}✓{:else if ligne.motif === 'JETE_PERIME'}⚠{:else}✕{/if}
					</span>
					<div class="details">
						<p class="nom">{ligne.nom}{#if ligne.marque}{' · '}{ligne.marque}{/if}</p>
						<p class="meta">
							×{formatQuantite(ligne.quantite)} · {formatDate.format(ligne.date)}
						</p>
					</div>
					<span class="motif-libelle">{LIBELLES[ligne.motif]}</span>
				</div>
				<form method="POST" action="?/restaurer" class="restaurer-form">
					<input type="hidden" name="id" value={ligne.id} />
					<button type="submit" class="restaurer">Restaurer</button>
				</form>
			</li>
		{/each}
	</ul>

	<p class="total">{data.total} ligne{data.total > 1 ? 's' : ''} au total</p>

	{#if data.totalPages > 1}
		<nav class="pagination">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)}>← Précédent</a>
			{/if}
			<span class="page-actuelle">Page {data.page} / {data.totalPages}</span>
			{#if data.page < data.totalPages}
				<a href={pageUrl(data.page + 1)}>Suivant →</a>
			{/if}
		</nav>
	{/if}
{/if}

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

	.recap {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.recap-item {
		border-radius: 10px;
		padding: 0.6rem 0.4rem;
		text-align: center;
		border: 1px solid #d0d7de;
	}

	.recap-nombre {
		display: block;
		font-size: 1.3rem;
		font-weight: 700;
	}

	.recap-libelle {
		display: block;
		font-size: 0.72rem;
		color: #57606a;
	}

	.recap-consomme {
		background: #dafbe1;
		border-color: #1a7f37;
	}
	.recap-consomme .recap-nombre {
		color: #1a7f37;
	}

	.recap-perime {
		background: #ffebe9;
		border-color: #cf222e;
	}
	.recap-perime .recap-nombre {
		color: #cf222e;
	}

	.recap-autre {
		background: #f6f8fa;
		border-color: #57606a;
	}
	.recap-autre .recap-nombre {
		color: #57606a;
	}

	.filtre {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.filtre label {
		font-size: 0.85rem;
		color: #57606a;
	}

	.filtre select {
		flex: 1;
		padding: 0.55rem;
		font-size: 1rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #fff;
	}

	.vide {
		background: #f6f8fa;
		border: 1px dashed #d0d7de;
		border-radius: 10px;
		padding: 1.5rem 1rem;
		text-align: center;
		color: #57606a;
	}

	.erreur {
		background: #ffebe9;
		border: 1px solid #cf222e;
		color: #cf222e;
		border-radius: 8px;
		padding: 0.6rem 0.75rem;
		font-size: 0.85rem;
		margin: 0 0 1rem;
	}

	.liste {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.ligne {
		border: 1px solid #d0d7de;
		border-left: 6px solid var(--couleur);
		border-radius: 10px;
		padding: 0.6rem 0.75rem;
		background: #fff;
	}

	.ligne-principale {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.restaurer-form {
		margin-top: 0.5rem;
		text-align: right;
	}

	.restaurer {
		min-height: 36px;
		padding: 0 0.75rem;
		font-size: 0.8rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #f6f8fa;
		color: #24292f;
		cursor: pointer;
	}

	.motif-CONSOMME {
		--couleur: #1a7f37;
	}
	.motif-JETE_PERIME {
		--couleur: #cf222e;
	}
	.motif-JETE_AUTRE {
		--couleur: #57606a;
	}

	.pastille {
		flex-shrink: 0;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 999px;
		background: var(--couleur);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
	}

	.details {
		flex: 1;
		min-width: 0;
	}

	.nom {
		margin: 0;
		font-weight: 600;
		font-size: 0.95rem;
		overflow-wrap: anywhere;
	}

	.meta {
		margin: 0.15rem 0 0;
		font-size: 0.8rem;
		color: #57606a;
	}

	.motif-libelle {
		flex-shrink: 0;
		color: var(--couleur);
		font-size: 0.78rem;
		font-weight: 600;
		text-align: right;
		max-width: 6rem;
	}

	.total {
		margin: 0.9rem 0 0;
		font-size: 0.82rem;
		color: #57606a;
		text-align: center;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.pagination a {
		color: #1f6feb;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.page-actuelle {
		font-size: 0.82rem;
		color: #57606a;
		margin-left: auto;
		margin-right: auto;
	}
</style>
