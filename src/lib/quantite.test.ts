import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculerSortiePartielle } from './quantite.ts';

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
