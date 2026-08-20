<script lang="ts">
	import EnteteEcran from '$lib/components/EnteteEcran.svelte';
	import Vignette from '$lib/components/Vignette.svelte';
	import { grouperParJour } from '$lib/historique';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const groupes = $derived(grouperParJour(data.lignes, new Date()));

	// Heure seule : le jour est déjà porté par l'en-tête du groupe.
	// Consommation.date est un véritable instant (contrairement à
	// dateImprimee/dateEffective, ancrées à minuit UTC comme jours
	// calendaires), donc formaté dans le fuseau local, sans forcer UTC.
	const formatHeure = new Intl.DateTimeFormat('fr-FR', {
		hour: '2-digit',
		minute: '2-digit'
	});

	const formatJour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });
	const formatJourAnnee = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const anneeCourante = new Date().getFullYear();

	function libelleJour(groupe: (typeof groupes)[number]): string {
		if (groupe.relatif === 'aujourdhui') return "Aujourd'hui";
		if (groupe.relatif === 'hier') return 'Hier';
		return groupe.jour.getFullYear() === anneeCourante
			? formatJour.format(groupe.jour)
			: formatJourAnnee.format(groupe.jour);
	}

	function formatQuantite(q: number) {
		return Number.isInteger(q) ? String(q) : q.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
	}

	const LIBELLES = {
		CONSOMME: 'Consommé',
		JETE_PERIME: 'Jeté (périmé)',
		JETE_AUTRE: 'Jeté (autre)'
	} as const;

	const SYMBOLES = {
		CONSOMME: '✓',
		JETE_PERIME: '⚠',
		JETE_AUTRE: '✕'
	} as const;

	const FILTRES = [
		{ valeur: null, libelle: 'Tous' },
		{ valeur: 'CONSOMME', libelle: 'Consommé' },
		{ valeur: 'JETE_PERIME', libelle: 'Jeté (périmé)' },
		{ valeur: 'JETE_AUTRE', libelle: 'Jeté (autre)' }
	] as const;

	function lienFiltre(motif: string | null): string {
		return motif ? `?motif=${motif}` : '?';
	}

	function pageUrl(page: number): string {
		const params = new URLSearchParams();
		if (data.motifFiltre) params.set('motif', data.motifFiltre);
		if (page > 1) params.set('page', String(page));
		const requete = params.toString();
		return requete ? `?${requete}` : '?';
	}
</script>

<svelte:head><title>Historique — Stoguard</title></svelte:head>

<EnteteEcran titre="Historique" libelleRetour="Retour au stock" />

<div class="stats">
	<div class="stat">
		<div class="chiffre consomme">{data.recapitulatif.CONSOMME}</div>
		<div class="libelle">Consommés</div>
	</div>
	<div class="stat">
		<div class="chiffre perime">{data.recapitulatif.JETE_PERIME}</div>
		<div class="libelle">Jetés (périmés)</div>
	</div>
	<div class="stat">
		<div class="chiffre autre">{data.recapitulatif.JETE_AUTRE}</div>
		<div class="libelle">Jetés (autres)</div>
	</div>
</div>

<nav class="filtres" aria-label="Filtrer par motif">
	{#each FILTRES as filtre (filtre.libelle)}
		<a
			href={lienFiltre(filtre.valeur)}
			class="puce"
			class:active={data.motifFiltre === filtre.valeur}
		>
			{filtre.libelle}
		</a>
	{/each}
</nav>

{#if form?.erreur}<p class="banniere banniere-danger">{form.erreur}</p>{/if}

{#if data.lignes.length === 0}
	<p class="vide">
		{#if data.motifFiltre}
			Aucune ligne pour ce motif.
		{:else}
			Aucun historique pour l'instant : les articles consommés ou jetés apparaîtront ici.
		{/if}
	</p>
{:else}
	{#each groupes as groupe (groupe.cle)}
		<h2 class="jour">{libelleJour(groupe)}</h2>
		<ul class="lignes">
			{#each groupe.lignes as ligne (ligne.id)}
				<li class="carte tuile motif-{ligne.motif}">
					<div class="haut">
						<div class="visuel">
							<Vignette src={ligne.imageUrl} />
							<span class="pastille" aria-hidden="true">{SYMBOLES[ligne.motif]}</span>
						</div>
						<div class="infos">
							<p class="nom">
								{ligne.marque ? `${ligne.nom} · ${ligne.marque}` : ligne.nom}
							</p>
							<p class="meta">
								×{formatQuantite(ligne.quantite)} · {formatHeure.format(ligne.date)}
							</p>
						</div>
						<span class="etiquette">{LIBELLES[ligne.motif]}</span>
					</div>

					{#if ligne.motif !== 'CONSOMME'}
						<form method="POST" action="?/restaurer" class="restaurer">
							<input type="hidden" name="id" value={ligne.id} />
							<button type="submit" class="bouton-secondaire">Restaurer</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/each}

	{#if data.totalPages > 1}
		<nav class="pagination" aria-label="Pagination">
			{#if data.page > 1}
				<a href={pageUrl(data.page - 1)}>← Précédent</a>
			{/if}
			<span>Page {data.page} sur {data.totalPages}</span>
			{#if data.page < data.totalPages}
				<a href={pageUrl(data.page + 1)}>Suivant →</a>
			{/if}
		</nav>
	{/if}
{/if}

<style>
	.stats {
		display: flex;
		gap: 8px;
		margin-bottom: 0.75rem;
	}

	.stat {
		flex: 1;
		min-width: 0;
		background: var(--stat-fond);
		backdrop-filter: blur(18px) saturate(180%);
		-webkit-backdrop-filter: blur(18px) saturate(180%);
		border: 1px solid var(--stat-bordure);
		border-radius: 14px;
		padding: 10px 8px;
		text-align: center;
	}

	.chiffre {
		font-size: 19px;
		font-weight: 700;
	}

	.consomme {
		color: var(--succes-plein);
	}
	.perime {
		color: var(--sev-danger);
	}
	.autre {
		color: var(--texte-attenue);
	}

	.libelle {
		font-size: 10px;
		color: var(--texte-attenue);
		margin-top: 2px;
	}

	.filtres {
		display: flex;
		gap: 8px;
		margin-bottom: 0.75rem;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.filtres::-webkit-scrollbar {
		display: none;
	}

	.puce {
		background: var(--puce-fond);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		color: var(--puce-texte);
		font-size: 13px;
		font-weight: 600;
		padding: 7px 14px;
		border-radius: 999px;
		white-space: nowrap;
		border: 1px solid var(--puce-bordure);
		text-decoration: none;
		flex-shrink: 0;
	}

	.puce.active {
		background: rgba(193, 98, 45, 0.75);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.3);
	}

	.jour {
		font-size: 12px;
		font-weight: 700;
		color: var(--texte-attenue);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 14px 0 6px;
	}

	.lignes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.carte {
		padding: 12px;
		border-radius: 16px;
		border-left: 4px solid var(--couleur);
	}

	.motif-CONSOMME {
		--couleur: var(--succes-plein);
	}
	.motif-JETE_PERIME {
		--couleur: var(--sev-danger);
	}
	.motif-JETE_AUTRE {
		--couleur: var(--texte-attenue);
	}

	.haut {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.visuel {
		position: relative;
		flex-shrink: 0;
		display: flex;
	}

	/* La pastille de motif se lit d'un coup d'œil dans une liste dense,
	   là où seule l'étiquette texte obligeait à lire chaque ligne. */
	.pastille {
		position: absolute;
		bottom: -3px;
		right: -3px;
		width: 18px;
		height: 18px;
		border-radius: 999px;
		background: var(--couleur);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 700;
		border: 2px solid var(--fond-page);
	}

	.motif-JETE_PERIME .pastille {
		color: var(--sev-badge-texte);
	}

	.infos {
		flex: 1;
		min-width: 0;
	}

	.nom {
		font-weight: 600;
		font-size: 14px;
		margin: 0;
	}

	.meta {
		font-size: 11.5px;
		color: var(--texte-attenue);
		margin: 1px 0 0;
	}

	.etiquette {
		font-size: 11px;
		font-weight: 700;
		color: var(--couleur);
		flex-shrink: 0;
		text-align: right;
	}

	.restaurer {
		text-align: right;
		margin-top: 8px;
	}

	.restaurer button {
		min-height: 32px;
		padding: 0 12px;
		border-radius: 9px;
		font-size: 12px;
	}

	.vide {
		background: var(--tuile-fond);
		border: 1px dashed var(--tuile-bordure);
		border-radius: var(--rayon-tuile);
		padding: 1.5rem 1rem;
		text-align: center;
		color: var(--texte-attenue);
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 1.25rem;
		font-size: 0.85rem;
		color: var(--texte-attenue);
	}

	.pagination a {
		color: var(--accent-texte);
		text-decoration: none;
		font-weight: 600;
	}
</style>
