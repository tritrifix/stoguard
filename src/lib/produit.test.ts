import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categorieAMettreAJour } from './produit.ts';

test('catégorie différente de celle en fiche : mise à jour renvoyée', () => {
	assert.equal(categorieAMettreAJour('cat-a', 'cat-b'), 'cat-b');
});

test("catégorie soumise vide alors qu'une catégorie était en fiche : mise à jour renvoyée (correction volontaire)", () => {
	assert.equal(categorieAMettreAJour('cat-a', null), null);
});

test('catégorie identique à celle en fiche : pas de mise à jour (undefined)', () => {
	assert.equal(categorieAMettreAJour('cat-a', 'cat-a'), undefined);
});

test("catégorie déjà absente et rien de soumis : pas de mise à jour, on n'écrase pas avec une catégorie par défaut", () => {
	assert.equal(categorieAMettreAJour(null, null), undefined);
});
