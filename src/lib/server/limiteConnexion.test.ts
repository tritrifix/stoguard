import assert from 'node:assert/strict';
import { test } from 'node:test';
import { enregistrerEchec, reinitialiserLimite, verifierLimite } from './limiteConnexion.ts';

test('une IP sans échec préalable n\'est jamais bloquée', () => {
	assert.equal(verifierLimite('192.0.2.1'), 0);
});

test('le délai augmente à chaque échec, jusqu\'au plafond', () => {
	const ip = '192.0.2.2';
	const t0 = 1_000_000;

	enregistrerEchec(ip, t0);
	assert.equal(verifierLimite(ip, t0), 1);

	enregistrerEchec(ip, t0);
	assert.equal(verifierLimite(ip, t0), 2);

	enregistrerEchec(ip, t0);
	assert.equal(verifierLimite(ip, t0), 4);

	for (let i = 0; i < 10; i++) enregistrerEchec(ip, t0);
	assert.equal(verifierLimite(ip, t0), 60);
});

test('le délai retombe à zéro une fois écoulé', () => {
	const ip = '192.0.2.3';
	const t0 = 1_000_000;
	enregistrerEchec(ip, t0);
	assert.equal(verifierLimite(ip, t0 + 1000), 0);
});

test('réinitialiser efface le compteur (succès de connexion)', () => {
	const ip = '192.0.2.4';
	enregistrerEchec(ip);
	reinitialiserLimite(ip);
	assert.equal(verifierLimite(ip), 0);
});

test('deux IP différentes ont des compteurs indépendants', () => {
	const t0 = 1_000_000;
	enregistrerEchec('192.0.2.5', t0);
	assert.equal(verifierLimite('192.0.2.6', t0), 0);
});
