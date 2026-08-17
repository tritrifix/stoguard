import assert from 'node:assert/strict';
import { test } from 'node:test';
import { articlesAPreoccuper, construireMessageNotification } from './notifications.ts';

test('PERIME et URGENT sont retenus, BIENTOT et OK sont exclus', () => {
	const lignes = [
		{ id: '1', nom: 'Yaourt', etat: 'PERIME' as const },
		{ id: '2', nom: 'Lait', etat: 'URGENT' as const },
		{ id: '3', nom: 'Fromage', etat: 'BIENTOT' as const },
		{ id: '4', nom: 'Conserve', etat: 'OK' as const }
	];

	const resultat = articlesAPreoccuper(lignes);

	assert.deepEqual(
		resultat.map((a) => a.id),
		['1', '2']
	);
});

test('aucun article préoccupant : aucun message (pas de notification vide)', () => {
	assert.equal(construireMessageNotification([]), null);
});

test('un seul article : le nomme dans le corps', () => {
	const message = construireMessageNotification([{ id: '1', nom: 'Yaourt nature', etat: 'PERIME' }]);
	assert.ok(message);
	assert.equal(message.titre, 'Stoguard');
	assert.equal(message.corps, '1 produit à consommer rapidement : Yaourt nature');
});

test('plusieurs articles : regroupés en un seul message avec le décompte, jamais un par produit', () => {
	const message = construireMessageNotification([
		{ id: '1', nom: 'Yaourt', etat: 'PERIME' },
		{ id: '2', nom: 'Lait', etat: 'URGENT' },
		{ id: '3', nom: 'Jambon', etat: 'URGENT' }
	]);
	assert.ok(message);
	assert.equal(message.corps, '3 produits à consommer rapidement');
	assert.doesNotMatch(message.corps, /Yaourt|Lait|Jambon/);
});
