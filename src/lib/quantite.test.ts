import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculerRestauration, calculerSortiePartielle } from './quantite.ts';

test('sortir une partie du stock laisse le reste attendu', () => {
	const resultat = calculerSortiePartielle('4', '1');
	assert.ok(resultat);
	assert.equal(resultat.nouvelleQuantite.toString(), '3');
	assert.equal(resultat.articleEpuise, false);
});

test('sortir tout le stock vide exactement, sans résidu flottant', () => {
	const resultat = calculerSortiePartielle('1', '1');
	assert.ok(resultat);
	assert.equal(resultat.nouvelleQuantite.toString(), '0');
	assert.equal(resultat.nouvelleQuantite.isZero(), true);
	assert.equal(resultat.articleEpuise, true);
});

test('3 - 1 - 1 - 1 donne exactement 0, jamais un résidu du type 0.0000001', () => {
	let quantite = '3';

	for (let i = 0; i < 3; i++) {
		const resultat = calculerSortiePartielle(quantite, '1');
		assert.ok(resultat, `sortie ${i + 1} refusée alors qu'elle devrait passer`);
		quantite = resultat.nouvelleQuantite.toString();
	}

	assert.equal(quantite, '0');
});

test('sortir une quantité décimale fonctionne sans erreur d\'arrondi', () => {
	const resultat = calculerSortiePartielle('0.5', '0.2');
	assert.ok(resultat);
	assert.equal(resultat.nouvelleQuantite.toString(), '0.3');
});

test('sortir plus que le stock restant est refusé', () => {
	assert.equal(calculerSortiePartielle('2', '3'), null);
});

test('sortir une quantité nulle ou négative est refusé', () => {
	assert.equal(calculerSortiePartielle('2', '0'), null);
	assert.equal(calculerSortiePartielle('2', '-1'), null);
});

test('sortir exactement tout ce qui reste épuise l\'article', () => {
	const resultat = calculerSortiePartielle('2.5', '2.5');
	assert.ok(resultat);
	assert.equal(resultat.articleEpuise, true);
});

test('restaurer une sortie additionne simplement la quantité', () => {
	const resultat = calculerRestauration('2', '1');
	assert.equal(resultat.nouvelleQuantite.toString(), '3');
});

test('restaurer sur un article épuisé (0) le remet en stock', () => {
	const resultat = calculerRestauration('0', '3');
	assert.equal(resultat.nouvelleQuantite.toString(), '3');
});

test(
	"article à 4, consommé 1 puis 3 (sorti à 0) : restaurer la ligne de 3 ramène à 3, " +
		'pas à 4 — puis restaurer celle de 1 ramène à 4',
	() => {
		const apresConso1 = calculerSortiePartielle('4', '1');
		assert.ok(apresConso1);
		assert.equal(apresConso1.nouvelleQuantite.toString(), '3');
		assert.equal(apresConso1.articleEpuise, false);

		const apresConso2 = calculerSortiePartielle(apresConso1.nouvelleQuantite, '3');
		assert.ok(apresConso2);
		assert.equal(apresConso2.nouvelleQuantite.toString(), '0');
		assert.equal(apresConso2.articleEpuise, true);

		// Restaurer la ligne de 3 (la plus récente) en premier.
		const apresRestauration1 = calculerRestauration(apresConso2.nouvelleQuantite, '3');
		assert.equal(apresRestauration1.nouvelleQuantite.toString(), '3');

		// Puis celle de 1.
		const apresRestauration2 = calculerRestauration(apresRestauration1.nouvelleQuantite, '1');
		assert.equal(apresRestauration2.nouvelleQuantite.toString(), '4');
	}
);
