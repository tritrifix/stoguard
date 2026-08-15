import assert from 'node:assert/strict';
import { test } from 'node:test';
import { creerJeton, hacherMotDePasse, verifierJeton, verifierMotDePasse } from './auth.ts';

test('un mot de passe correct se vérifie contre son hash', () => {
	const hash = hacherMotDePasse('correct-horse-battery-staple');
	assert.equal(verifierMotDePasse('correct-horse-battery-staple', hash), true);
});

test('un mauvais mot de passe est rejeté', () => {
	const hash = hacherMotDePasse('correct-horse-battery-staple');
	assert.equal(verifierMotDePasse('mauvais-mot-de-passe', hash), false);
});

test('deux hachages du même mot de passe diffèrent (sel aléatoire)', () => {
	const hash1 = hacherMotDePasse('correct-horse-battery-staple');
	const hash2 = hacherMotDePasse('correct-horse-battery-staple');
	assert.notEqual(hash1, hash2);
	// Mais les deux restent valides pour ce mot de passe.
	assert.equal(verifierMotDePasse('correct-horse-battery-staple', hash1), true);
	assert.equal(verifierMotDePasse('correct-horse-battery-staple', hash2), true);
});

test('un hash mal formé est rejeté plutôt que de lever une exception', () => {
	assert.equal(verifierMotDePasse('peu importe', ''), false);
	assert.equal(verifierMotDePasse('peu importe', 'pas-du-tout-le-bon-format'), false);
});

test('un jeton valide, non expiré, est accepté', () => {
	const secret = 'secret-de-test';
	const jeton = creerJeton(new Date('2026-01-01T00:00:00Z'), secret);
	assert.equal(verifierJeton(jeton, secret, new Date('2025-12-31T00:00:00Z')), true);
});

test('un jeton expiré est rejeté', () => {
	const secret = 'secret-de-test';
	const jeton = creerJeton(new Date('2026-01-01T00:00:00Z'), secret);
	assert.equal(verifierJeton(jeton, secret, new Date('2026-01-01T00:00:01Z')), false);
});

test('un jeton signé avec un autre secret est rejeté', () => {
	const jeton = creerJeton(new Date('2026-01-01T00:00:00Z'), 'secret-a');
	assert.equal(verifierJeton(jeton, 'secret-b', new Date('2025-01-01T00:00:00Z')), false);
});

test("un jeton dont l'expiration a été modifiée après signature est rejeté", () => {
	const secret = 'secret-de-test';
	const jeton = creerJeton(new Date('2026-01-01T00:00:00Z'), secret);
	const [, signature] = jeton.split('.');
	const falsifie = `${new Date('2099-01-01T00:00:00Z').getTime()}.${signature}`;
	assert.equal(verifierJeton(falsifie, secret, new Date('2030-01-01T00:00:00Z')), false);
});

test('un jeton mal formé est rejeté sans lever d\'exception', () => {
	assert.equal(verifierJeton('', 'secret'), false);
	assert.equal(verifierJeton('sans-point', 'secret'), false);
	assert.equal(verifierJeton('123.pas-de-la-hex-valide', 'secret'), false);
});
