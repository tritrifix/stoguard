<script lang="ts">
	import BasculeTheme from '$lib/components/BasculeTheme.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const VERSION = '1.0';
</script>

<svelte:head><title>Réglages — Stoguard</title></svelte:head>

<header><h1>Réglages</h1></header>

<div class="sections">
	<a class="tuile ligne compte" href="/parametres/mot-de-passe">
		<span class="avatar" aria-hidden="true">S</span>
		<span class="texte">
			<span class="titre">Compte</span>
			<span class="sous-titre">Modifier le mot de passe</span>
		</span>
		<svg width="8" height="14" viewBox="0 0 9 16" fill="none" aria-hidden="true">
			<path d="M1 1l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</a>

	<section class="tuile">
		<h2>Apparence</h2>
		<div class="ligne-interne">
			<span class="texte">
				<span class="titre">Thème sombre</span>
				<span class="sous-titre">Suit le bouton des autres écrans</span>
			</span>
			<BasculeTheme compact />
		</div>
	</section>

	<section class="tuile">
		<h2>Catégories &amp; délais</h2>
		<p class="sous-titre bloc">Délai après ouverture par défaut, par catégorie</p>
		{#each data.categories as categorie (categorie.id)}
			<div class="rangee">
				<span>{categorie.nom}</span>
				<span class="valeur">
					{categorie.delaiApresOuverture} jour{categorie.delaiApresOuverture === 1 ? '' : 's'}
				</span>
			</div>
		{/each}
		<p class="note">
			{data.nombreCategories} catégories et {data.nombreEmplacements} emplacements. Leur gestion
			depuis l'application arrive dans une prochaine étape ; en attendant, la catégorie d'un
			produit se change depuis la fiche de l'article.
		</p>
	</section>

	<a class="tuile ligne" href="/parametres/notifications">
		<span class="texte">
			<span class="titre">Notifications</span>
			<span class="sous-titre">Alertes de péremption et heure d'envoi</span>
		</span>
		<svg width="8" height="14" viewBox="0 0 9 16" fill="none" aria-hidden="true">
			<path d="M1 1l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</a>

	<a class="tuile ligne" href="/maintenance">
		<span class="texte">
			<span class="titre">Avancé</span>
			<span class="sous-titre">Maintenance, purge des données</span>
		</span>
		<svg width="8" height="14" viewBox="0 0 9 16" fill="none" aria-hidden="true">
			<path d="M1 1l7 7-7 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</a>

	<form method="POST" action="/?/deconnexion">
		<button type="submit" class="deconnexion">Se déconnecter</button>
	</form>

	<p class="version">Stoguard · version {VERSION}</p>
</div>

<style>
	header {
		margin-bottom: 0.85rem;
	}

	h1 {
		font-weight: 700;
		font-size: 17px;
		text-align: center;
		margin: 0;
		/* Aligné sur la hauteur du bouton retour des autres écrans, qui
		   n'existe pas ici : Réglages est une destination de la barre. */
		line-height: 40px;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.tuile {
		padding: 14px;
		border-radius: 18px;
	}

	h2 {
		font-size: 13px;
		font-weight: 700;
		margin: 0 0 12px;
	}

	.ligne,
	.ligne-interne {
		display: flex;
		align-items: center;
		gap: 12px;
		color: var(--texte);
		text-decoration: none;
	}

	.ligne {
		color: var(--texte-attenue);
	}

	.texte {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.titre {
		font-size: 14px;
		font-weight: 700;
		color: var(--texte);
	}

	.sous-titre {
		font-size: 11.5px;
		color: var(--texte-attenue);
		margin-top: 1px;
	}

	.sous-titre.bloc {
		margin: -8px 0 10px;
	}

	.avatar {
		width: 46px;
		height: 46px;
		border-radius: 999px;
		background: var(--accent-degrade);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		font-weight: 700;
		font-size: 17px;
		flex-shrink: 0;
	}

	.compte .titre {
		font-size: 15px;
	}

	.rangee {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 9px 0;
		border-top: 1px solid var(--puce-bordure);
		font-size: 13.5px;
	}

	.valeur {
		font-size: 12.5px;
		color: var(--texte-attenue);
		white-space: nowrap;
	}

	.note {
		font-size: 11px;
		color: var(--texte-attenue);
		line-height: 1.5;
		margin: 10px 0 0;
	}

	.deconnexion {
		width: 100%;
		min-height: 48px;
		border-radius: 16px;
		background: var(--puce-fond);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border: 1px solid var(--puce-bordure);
		color: var(--danger-texte);
		font-family: inherit;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}

	.version {
		text-align: center;
		font-size: 11px;
		color: var(--texte-attenue);
		margin: 0;
	}
</style>
