import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleJourLocal, grouperParJour } from './historique.ts';

// Construites en heure locale : le jour d'appartenance d'une consommation
// est le jour local de l'utilisateur, pas le jour UTC.
const instant = (a: number, m: number, j: number, h = 12, min = 0) =>
	new Date(a, m - 1, j, h, min);

const ligne = (date: Date, nom = 'x') => ({ date, nom });

test('les lignes du même jour local sont regroupées ensemble', () => {
	const maintenant = instant(2026, 8, 20);
	const groupes = grouperParJour(
		[ligne(instant(2026, 8, 20, 18)), ligne(instant(2026, 8, 20, 8))],
		maintenant
	);

	assert.equal(groupes.length, 1);
	assert.equal(groupes[0].lignes.length, 2);
	assert.equal(groupes[0].relatif, 'aujourdhui');
});

test('aujourd’hui, hier et un jour plus ancien forment trois groupes distincts', () => {
	const maintenant = instant(2026, 8, 20);
	const groupes = grouperParJour(
		[
			ligne(instant(2026, 8, 20, 8)),
			ligne(instant(2026, 8, 19, 19)),
			ligne(instant(2026, 8, 16, 9))
		],
		maintenant
	);

	assert.deepEqual(
		groupes.map((g) => g.relatif),
		['aujourdhui', 'hier', null]
	);
});

test('une sortie enregistrée tard le soir reste dans son jour local', () => {
	// 23h30 le 20 est déjà le 21 en UTC dans les fuseaux à l'est de Greenwich :
	// le regroupement ne doit pas basculer pour autant.
	const maintenant = instant(2026, 8, 20, 23, 45);
	const groupes = grouperParJour([ligne(instant(2026, 8, 20, 23, 30))], maintenant);

	assert.equal(groupes.length, 1);
	assert.equal(groupes[0].relatif, 'aujourdhui');
	assert.equal(groupes[0].cle, '2026-08-20');
});

test('« hier » franchit correctement un changement de mois', () => {
	const maintenant = instant(2026, 9, 1, 10);
	const groupes = grouperParJour([ligne(instant(2026, 8, 31, 20))], maintenant);

	assert.equal(groupes[0].relatif, 'hier');
});

test('l’ordre d’entrée est conservé, aucun tri n’est refait', () => {
	const maintenant = instant(2026, 8, 20);
	const groupes = grouperParJour(
		[
			ligne(instant(2026, 8, 20, 8), 'a'),
			ligne(instant(2026, 8, 20, 18), 'b'),
			ligne(instant(2026, 8, 19, 9), 'c')
		],
		maintenant
	);

	assert.deepEqual(
		groupes[0].lignes.map((l) => l.nom),
		['a', 'b']
	);
	assert.deepEqual(
		groupes[1].lignes.map((l) => l.nom),
		['c']
	);
});

test('deux jours non consécutifs séparés par un jour vide restent deux groupes', () => {
	const maintenant = instant(2026, 8, 20);
	const groupes = grouperParJour(
		[ligne(instant(2026, 8, 18, 8)), ligne(instant(2026, 8, 16, 8))],
		maintenant
	);

	assert.equal(groupes.length, 2);
	assert.deepEqual(
		groupes.map((g) => g.relatif),
		[null, null]
	);
});

test('la clé de jour est zéro-remplie', () => {
	assert.equal(cleJourLocal(instant(2026, 1, 5)), '2026-01-05');
});

test('une liste vide ne produit aucun groupe', () => {
	assert.deepEqual(grouperParJour([], instant(2026, 8, 20)), []);
});
