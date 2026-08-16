<script lang="ts">
	import { libelleEtat } from '$lib/dates';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// timeZone UTC : les dates de péremption sont stockées à minuit UTC comme
	// jours calendaires. Les formater dans le fuseau local les décalerait.
	const formatDate = new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		timeZone: 'UTC'
	});

	function formatQuantite(q: number) {
		return Number.isInteger(q) ? String(q) : q.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
	}
</script>

<svelte:head><title>Stock — Stoguard</title></svelte:head>

<header>
	<h1>Mon stock</h1>
	<div class="actions-entete">
		<a class="scanner" href="/scanner">Scanner</a>
		<a class="ajouter" href="/ajouter">+ Ajouter</a>
		<form method="POST" action="?/deconnexion">
			<button type="submit" class="deconnexion">Déconnexion</button>
		</form>
	</div>
</header>

<form method="GET" class="filtre">
	<label for="emplacement">Emplacement</label>
	<select id="emplacement" name="emplacement" onchange={(e) => e.currentTarget.form?.requestSubmit()}>
		<option value="">Tous</option>
		{#each data.emplacements as emplacement (emplacement.id)}
			<option value={emplacement.id} selected={emplacement.id === data.emplacementFiltre}>
				{emplacement.nom}
			</option>
		{/each}
	</select>
	<noscript><button type="submit">Filtrer</button></noscript>
</form>

{#if data.lignes.length === 0}
	<p class="vide">
		{#if data.emplacementFiltre}
			Aucun article dans cet emplacement.
		{:else}
			Votre stock est vide. Ajoutez un premier article pour commencer à suivre ses dates.
		{/if}
	</p>
{:else}
	<ul class="stock">
		{#each data.lignes as ligne (ligne.id)}
			<li class="carte sev-{ligne.severite}">
				<div class="entete">
					<span class="nom">{ligne.nom}</span>
					{#if ligne.estOuvert}<span class="ouvert">Ouvert</span>{/if}
				</div>

				<p class="meta">
					{#if ligne.marque}{ligne.marque} · {/if}{ligne.emplacement} · ×{formatQuantite(
						ligne.quantite
					)}{#if ligne.contenance} · {ligne.contenance}{/if}
				</p>

				<p class="echeance">
					<span class="badge">{ligne.typeDate}</span>
					{formatDate.format(ligne.dateEffective)}
					<span class="etat">{libelleEtat(ligne.etat, ligne.typeDate, ligne.jours)}</span>
				</p>

				<div class="actions">
					{#if !ligne.estOuvert}
						<form method="POST" action="?/ouvrir">
							<input type="hidden" name="id" value={ligne.id} />
							<button type="submit">Ouvrir</button>
						</form>
					{/if}
					<form method="POST" action="?/consommer">
						<input type="hidden" name="id" value={ligne.id} />
						<button type="submit" class="primaire">Consommé</button>
					</form>
					<form method="POST" action="?/jeter">
						<input type="hidden" name="id" value={ligne.id} />
						<input type="hidden" name="motif" value="JETE_PERIME" />
						<button type="submit" class="danger">Jeté (périmé)</button>
					</form>
					<form method="POST" action="?/jeter">
						<input type="hidden" name="id" value={ligne.id} />
						<input type="hidden" name="motif" value="JETE_AUTRE" />
						<button type="submit" class="danger">Jeté (autre)</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 1.4rem;
		margin: 0;
	}

	.actions-entete {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.scanner {
		background: none;
		border: 1px solid #1f6feb;
		color: #1f6feb;
		text-decoration: none;
		padding: 0.6rem 0.9rem;
		border-radius: 8px;
		font-weight: 600;
		white-space: nowrap;
	}

	.ajouter {
		background: #1f6feb;
		color: #fff;
		text-decoration: none;
		padding: 0.6rem 0.9rem;
		border-radius: 8px;
		font-weight: 600;
		white-space: nowrap;
	}

	.deconnexion {
		background: none;
		border: 1px solid #d0d7de;
		color: #57606a;
		padding: 0.6rem 0.75rem;
		border-radius: 8px;
		font-size: 0.85rem;
		cursor: pointer;
		white-space: nowrap;
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

	.stock {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.carte {
		border: 1px solid #d0d7de;
		/* Le liseré gauche porte l'état : lisible d'un coup d'œil au pouce. */
		border-left: 6px solid var(--couleur);
		border-radius: 10px;
		padding: 0.75rem;
		background: #fff;
	}

	.sev-danger {
		--couleur: #cf222e;
	}
	.sev-qualite {
		--couleur: #8250df;
	}
	.sev-urgent {
		--couleur: #d1242f;
	}
	.sev-bientot {
		--couleur: #bf8700;
	}
	.sev-ok {
		--couleur: #1a7f37;
	}

	.entete {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.nom {
		font-weight: 600;
		font-size: 1.05rem;
	}

	.ouvert {
		background: #fff1e5;
		color: #bc4c00;
		border: 1px solid #f5c396;
		border-radius: 999px;
		padding: 0.1rem 0.5rem;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.meta {
		margin: 0.25rem 0 0.5rem;
		font-size: 0.85rem;
		color: #57606a;
	}

	.echeance {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.badge {
		background: var(--couleur);
		color: #fff;
		border-radius: 4px;
		padding: 0.1rem 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
	}

	.etat {
		color: var(--couleur);
		font-weight: 600;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.actions button {
		/* 44px de haut : cible tactile confortable sur téléphone. */
		min-height: 44px;
		padding: 0 0.75rem;
		font-size: 0.85rem;
		border: 1px solid #d0d7de;
		border-radius: 8px;
		background: #f6f8fa;
		color: #24292f;
		cursor: pointer;
	}

	.actions button.primaire {
		background: #1a7f37;
		border-color: #1a7f37;
		color: #fff;
		font-weight: 600;
	}

	.actions button.danger {
		color: #cf222e;
	}
</style>
