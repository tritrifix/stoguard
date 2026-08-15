import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	ajouterJours,
	aujourdhui,
	dateEffective,
	etatArticle,
	joursRestants,
	parseJour,
	severite,
	versChampDate
} from './dates.ts';

const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

const article = (surcharges: Partial<Parameters<typeof dateEffective>[0]> = {}) => ({
	dateImprimee: jour('2026-01-20'),
	estOuvert: false,
	dateOuverture: null,
	delaiOuverture: null,
	delaiCategorie: null,
	...surcharges
});

test('article fermé : la date imprimée fait foi', () => {
	assert.deepEqual(dateEffective(article()), jour('2026-01-20'));
});

test('article fermé : les délais sont ignorés', () => {
	const a = article({ delaiOuverture: 1, delaiCategorie: 1, dateOuverture: jour('2026-01-01') });
	assert.deepEqual(dateEffective(a), jour('2026-01-20'));
});

test('ouvert : le délai de la catégorie avance la date', () => {
	const a = article({ estOuvert: true, dateOuverture: jour('2026-01-10'), delaiCategorie: 3 });
	assert.deepEqual(dateEffective(a), jour('2026-01-13'));
});

test("ouvert : le délai de l'article prime sur celui de la catégorie", () => {
	const a = article({
		estOuvert: true,
		dateOuverture: jour('2026-01-10'),
		delaiOuverture: 1,
		delaiCategorie: 3
	});
	assert.deepEqual(dateEffective(a), jour('2026-01-11'));
});

test("ouvert : la date imprimée gagne si elle est plus proche que l'ouverture + délai", () => {
	const a = article({ estOuvert: true, dateOuverture: jour('2026-01-19'), delaiCategorie: 30 });
	assert.deepEqual(dateEffective(a), jour('2026-01-20'));
});

test('ouvert sans aucun délai connu : la date imprimée fait foi', () => {
	const a = article({ estOuvert: true, dateOuverture: jour('2026-01-10') });
	assert.deepEqual(dateEffective(a), jour('2026-01-20'));
});

test('ouvert sans date d’ouverture enregistrée : la date imprimée fait foi', () => {
	const a = article({ estOuvert: true, delaiCategorie: 3 });
	assert.deepEqual(dateEffective(a), jour('2026-01-20'));
});

test('ajouterJours franchit correctement les mois', () => {
	assert.deepEqual(ajouterJours(jour('2026-01-30'), 3), jour('2026-02-02'));
});

test('ajouterJours franchit une année bissextile', () => {
	assert.deepEqual(ajouterJours(jour('2028-02-28'), 1), jour('2028-02-29'));
});

test('joursRestants compare des jours, pas des heures', () => {
	const soir = new Date('2026-01-20T23:30:00Z');
	assert.equal(joursRestants(jour('2026-01-20'), soir), 0);
	assert.equal(joursRestants(jour('2026-01-21'), soir), 1);
	assert.equal(joursRestants(jour('2026-01-19'), soir), -1);
});

test('les seuils de badge suivent les jours restants', () => {
	const maintenant = jour('2026-01-20');
	assert.equal(etatArticle(jour('2026-01-19'), maintenant), 'PERIME');
	assert.equal(etatArticle(jour('2026-01-20'), maintenant), 'URGENT');
	assert.equal(etatArticle(jour('2026-01-23'), maintenant), 'URGENT');
	assert.equal(etatArticle(jour('2026-01-24'), maintenant), 'BIENTOT');
	assert.equal(etatArticle(jour('2026-01-27'), maintenant), 'BIENTOT');
	assert.equal(etatArticle(jour('2026-01-28'), maintenant), 'OK');
});

test('une DLC dépassée est un danger, une DDM dépassée non', () => {
	assert.equal(severite('PERIME', 'DLC'), 'danger');
	assert.equal(severite('PERIME', 'DDM'), 'qualite');
	assert.equal(severite('URGENT', 'DLC'), 'urgent');
	assert.equal(severite('OK', 'DDM'), 'ok');
});

test("une date saisie est ancrée à minuit UTC, pas à minuit local", () => {
	assert.deepEqual(parseJour('2026-08-14'), new Date('2026-08-14T00:00:00.000Z'));
	assert.equal(parseJour('14/08/2026'), null);
	assert.equal(parseJour(''), null);
});

test('aller-retour saisie -> Date -> champ de formulaire', () => {
	assert.equal(versChampDate(parseJour('2026-08-14')!), '2026-08-14');
});

test("aujourdhui retient le jour calendaire local, ancré à minuit UTC", () => {
	// 23h30 heure locale : le jour de l'utilisateur est bien celui du 20.
	const soirLocal = new Date(2026, 0, 20, 23, 30);
	assert.deepEqual(aujourdhui(soirLocal), new Date('2026-01-20T00:00:00.000Z'));
});
