<script lang="ts">
	import { aujourdhui, libelleEtat, versChampDate } from '$lib/dates';
	import BasculeTheme from '$lib/components/BasculeTheme.svelte';
	import Vignette from '$lib/components/Vignette.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// Quantité à sortir, saisie par l'utilisateur, uniquement pour les
	// articles à plus d'une unité (clé = id de l'article). Préremplie à 1.
	let quantites = $state<Record<string, number>>({});

	// Choix de la date d'ouverture : un seul article à la fois peut avoir son
	// sélecteur ouvert (id ou null). Le bouton "Ouvrir" ne soumet plus
	// directement — il révèle ce choix, qui disparaît de la carte dès que
	// l'ouverture est confirmée (ligne.estOuvert passe à true) ou annulée.
	let articleEnOuverture = $state<string | null>(null);
	let modeDate = $state<'aujourdhui' | 'autre'>('aujourdhui');
	let dateChoisie = $state('');
	const dateDuJour = versChampDate(aujourdhui());

	const nombrePerimes = $derived(data.lignes.filter((l) => l.etat === 'PERIME').length);
	const nombreSousSeptJours = $derived(
		data.lignes.filter((l) => l.jours >= 0 && l.jours <= 7).length
	);

	function commencerOuverture(id: string) {
		articleEnOuverture = id;
		modeDate = 'aujourdhui';
		dateChoisie = dateDuJour;
	}

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

	function lienEmplacement(id: string | null) {
		return id === null ? '/' : `/?emplacement=${id}`;
	}
</script>

<svelte:head><title>Stock — Stoguard</title></svelte:head>

<header>
	<h1>Mon stock</h1>
	<BasculeTheme />
</header>

<div class="stats">
	<div class="stat">
		<div class="chiffre" style="color: var(--stat-articles)">{data.lignes.length}</div>
		<div class="libelle">Articles</div>
	</div>
	<div class="stat">
		<div class="chiffre" style="color: var(--stat-perime)">{nombrePerimes}</div>
		<div class="libelle">Périmé</div>
	</div>
	<div class="stat">
		<div class="chiffre" style="color: var(--stat-bientot)">{nombreSousSeptJours}</div>
		<div class="libelle">Sous 7 j</div>
	</div>
</div>

<nav class="filtres" aria-label="Filtrer par emplacement">
	<a href={lienEmplacement(null)} class="puce" class:active={!data.emplacementFiltre}>Tous</a>
	{#each data.emplacements as emplacement (emplacement.id)}
		<a
			href={lienEmplacement(emplacement.id)}
			class="puce"
			class:active={emplacement.id === data.emplacementFiltre}
		>
			{emplacement.nom}
		</a>
	{/each}
</nav>

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
			<li class="carte tuile sev-{ligne.severite}">
				<div class="ligne-haut">
					<Vignette src={ligne.imageUrl} />
					<div class="infos">
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
							<span class="date">{formatDate.format(ligne.dateEffective)}</span>
							<span class="etat">{libelleEtat(ligne.etat, ligne.typeDate, ligne.jours)}</span>
						</p>
					</div>

					<a class="modifier" href="/article/{ligne.id}/modifier" aria-label="Modifier {ligne.nom}">
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<path
								d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3z"
								stroke="currentColor"
								stroke-width="1.7"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</a>
				</div>

				{#if ligne.quantite > 1}
					<label class="quantite-label" for={`qte-${ligne.id}`}>
						Quantité à sortir (sur {formatQuantite(ligne.quantite)})
					</label>
					<input
						id={`qte-${ligne.id}`}
						class="champ quantite-input"
						type="number"
						step="0.001"
						min="0.001"
						max={ligne.quantite}
						value={quantites[ligne.id] ?? 1}
						oninput={(e) => (quantites[ligne.id] = e.currentTarget.valueAsNumber)}
					/>
				{/if}

				{#if !ligne.estOuvert && articleEnOuverture === ligne.id}
					<form method="POST" action="?/ouvrir" class="choix-ouverture">
						<input type="hidden" name="id" value={ligne.id} />
						<div class="mode-date">
							<label class="radio-inline">
								<input
									type="radio"
									name={`mode-${ligne.id}`}
									checked={modeDate === 'aujourdhui'}
									onchange={() => (modeDate = 'aujourdhui')}
								/>
								<span>Aujourd'hui</span>
							</label>
							<label class="radio-inline">
								<input
									type="radio"
									name={`mode-${ligne.id}`}
									checked={modeDate === 'autre'}
									onchange={() => (modeDate = 'autre')}
								/>
								<span>Autre date</span>
							</label>
						</div>
						{#if modeDate === 'autre'}
							<input
								type="date"
								name="dateOuverture"
								class="champ date-ouverture-input"
								max={dateDuJour}
								value={dateChoisie}
								oninput={(e) => (dateChoisie = e.currentTarget.value)}
								required
							/>
						{/if}
						{#if form?.erreur}<p class="erreur">{form.erreur}</p>{/if}
						<div class="choix-ouverture-actions">
							<button type="submit" class="valider">Confirmer l'ouverture</button>
							<button type="button" class="bouton-secondaire" onclick={() => (articleEnOuverture = null)}>
								Annuler
							</button>
						</div>
					</form>
				{/if}

				<div class="actions">
					{#if !ligne.estOuvert}
						{#if articleEnOuverture !== ligne.id}
							<button type="button" class="bouton-secondaire" onclick={() => commencerOuverture(ligne.id)}>
								Ouvrir
							</button>
						{/if}
					{:else}
						<form method="POST" action="?/annulerOuverture">
							<input type="hidden" name="id" value={ligne.id} />
							<button type="submit" class="bouton-secondaire">Annuler l'ouverture</button>
						</form>
					{/if}
					<form method="POST" action="?/consommer">
						<input type="hidden" name="id" value={ligne.id} />
						<input type="hidden" name="quantite" value={quantites[ligne.id] ?? 1} />
						<button type="submit" class="succes">Consommé</button>
					</form>
					<form method="POST" action="?/jeter">
						<input type="hidden" name="id" value={ligne.id} />
						<input type="hidden" name="quantite" value={quantites[ligne.id] ?? 1} />
						<input type="hidden" name="motif" value="JETE_PERIME" />
						<button type="submit" class="bouton-secondaire danger">Jeté (périmé)</button>
					</form>
					<form method="POST" action="?/jeter">
						<input type="hidden" name="id" value={ligne.id} />
						<input type="hidden" name="quantite" value={quantites[ligne.id] ?? 1} />
						<input type="hidden" name="motif" value="JETE_AUTRE" />
						<button type="submit" class="bouton-secondaire danger">Jeté (autre)</button>
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
		gap: 0.75rem;
		margin-bottom: 0.85rem;
	}

	h1 {
		font-size: 27px;
		font-weight: 700;
		letter-spacing: -0.3px;
		margin: 0;
	}

	.stats {
		display: flex;
		gap: 8px;
		margin-bottom: 0.9rem;
	}

	.stat {
		flex: 1;
		min-width: 0;
		background: var(--stat-fond);
		backdrop-filter: blur(18px) saturate(180%);
		-webkit-backdrop-filter: blur(18px) saturate(180%);
		border: 1px solid var(--stat-bordure);
		border-radius: 14px;
		padding: 8px 10px;
	}

	.chiffre {
		font-size: 17px;
		font-weight: 700;
	}

	.libelle {
		font-size: 11px;
		color: var(--texte-attenue);
	}

	.filtres {
		display: flex;
		gap: 8px;
		margin-bottom: 0.9rem;
		overflow-x: auto;
		/* Les puces gardent leur largeur naturelle et défilent horizontalement
		   plutôt que de se comprimer sur un écran étroit. */
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

	.vide {
		background: var(--tuile-fond);
		border: 1px dashed var(--tuile-bordure);
		border-radius: var(--rayon-tuile);
		padding: 1.5rem 1rem;
		text-align: center;
		color: var(--texte-attenue);
	}

	.stock {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.carte {
		padding: 14px;
		/* Le liseré gauche porte l'état : lisible d'un coup d'œil au pouce. */
		border-left: 4px solid var(--couleur);
	}

	.sev-danger {
		--couleur: var(--sev-danger);
	}
	.sev-qualite {
		--couleur: var(--sev-qualite);
	}
	.sev-urgent {
		--couleur: var(--sev-urgent);
	}
	.sev-bientot {
		--couleur: var(--sev-bientot);
	}
	.sev-ok {
		--couleur: var(--succes-plein);
	}

	.ligne-haut {
		display: flex;
		gap: 10px;
	}

	.infos {
		/* Sans ça, le texte ne rétrécit pas sous sa largeur naturelle et pousse
		   la vignette hors de la carte au lieu de passer à la ligne. */
		min-width: 0;
		flex: 1;
	}

	.entete {
		display: flex;
		align-items: baseline;
		gap: 6px;
		flex-wrap: wrap;
	}

	.nom {
		font-weight: 700;
		font-size: 15px;
	}

	.ouvert {
		background: var(--ouvert-fond);
		color: var(--ouvert-texte);
		font-size: 10px;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 999px;
		text-transform: uppercase;
	}

	/* Hors du bloc de texte : dans l'en-tête, un nom long le renvoyait à la
	   ligne suivante et creusait un trou dans la carte. */
	.modifier {
		color: var(--texte-attenue);
		display: flex;
		align-items: flex-start;
		justify-content: flex-end;
		flex-shrink: 0;
		/* Cible tactile confortable pour une icône de 15px. */
		min-width: 40px;
		min-height: 40px;
		margin: -6px -6px 0 0;
		padding-top: 6px;
	}

	.meta {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--texte-attenue);
	}

	.echeance {
		margin: 6px 0 0;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 12px;
	}

	.badge {
		background: var(--couleur);
		color: var(--sev-badge-texte);
		font-size: 10px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 5px;
	}

	.date {
		font-family: var(--police-mono);
		color: var(--texte-attenue);
	}

	.etat {
		color: var(--couleur);
		font-weight: 700;
	}

	.quantite-label {
		display: block;
		font-size: 11px;
		color: var(--texte-attenue);
		margin: 10px 0 0.25rem;
	}

	.quantite-input {
		margin-bottom: 0.2rem;
	}

	.choix-ouverture {
		background: var(--secondaire-fond);
		border: 1px solid var(--secondaire-bordure);
		border-radius: 14px;
		padding: 0.6rem 0.75rem;
		margin-top: 10px;
	}

	.mode-date {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
	}

	.radio-inline {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 13px;
	}

	.radio-inline input {
		width: 1.1rem;
		height: 1.1rem;
		margin: 0;
		flex-shrink: 0;
		accent-color: var(--accent);
	}

	.date-ouverture-input {
		margin-top: 0.5rem;
	}

	.choix-ouverture-actions {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.6rem;
	}

	.choix-ouverture-actions button {
		flex: 1;
		min-height: 40px;
		padding: 0 0.6rem;
		font-size: 12px;
	}

	.valider {
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: var(--rayon-champ);
		background: rgba(193, 98, 45, 0.9);
		color: #fff;
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.erreur {
		color: var(--danger-texte);
		font-size: 0.82rem;
		margin: 0.5rem 0 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}

	/* Les formulaires ne doivent pas former de boîte : sans ça, chaque bouton
	   serait enfermé dans son propre conteneur et la rangée ne pourrait plus
	   les répartir. */
	.actions form {
		display: contents;
	}

	.actions button {
		/* Deux boutons par rangée : les actions principales d'abord, les deux
		   motifs de jet ensuite. À 320px, quatre boutons sur une seule rangée
		   deviennent illisibles. */
		flex: 1 1 calc(50% - 3px);
		min-height: 40px;
		padding: 0 0.5rem;
		font-size: 12px;
		border-radius: 11px;
	}

	.succes {
		border: 1px solid var(--succes-bordure);
		border-radius: 11px;
		background: var(--succes-fond);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: var(--succes-texte);
		font-family: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.danger {
		color: var(--danger-texte);
	}
</style>
