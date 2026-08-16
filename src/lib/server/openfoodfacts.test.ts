import assert from 'node:assert/strict';
import { test } from 'node:test';
import { convertirProduitOpenFoodFacts } from './openfoodfacts.ts';

// Réponse réelle de https://world.openfoodfacts.org/api/v2/product/3017620422003.json
// (EAN Nutella), figée le 16/08/2026 pour ne dépendre d'aucun accès réseau.
const REPONSE_NUTELLA = {
	code: '3017620422003',
	product: {
		brands: 'Nutella, Ferrero, Yum yum',
		categories_tags: [
			'en:breakfasts',
			'en:spreads',
			'en:sweet-spreads',
			'en:confectionary-based-spreads'
		],
		image_url: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg',
		product_name: 'Nutella',
		quantity: ''
	},
	status: 1,
	status_verbose: 'product found'
};

// Réponse réelle pour un EAN au format valide mais absent de la base
// (9999999999993), figée le 16/08/2026.
const REPONSE_ABSENTE = {
	code: '9999999999993',
	status: 0,
	status_verbose: 'product not found'
};

test('un produit complet est correctement converti', () => {
	assert.deepEqual(convertirProduitOpenFoodFacts(REPONSE_NUTELLA), {
		nom: 'Nutella',
		marque: 'Nutella, Ferrero, Yum yum',
		// "quantity": "" chez Open Food Facts pour ce produit précis : une
		// chaîne vide n'est pas une contenance exploitable.
		contenance: null,
		imageUrl: 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg'
	});
});

test('un produit avec des champs manquants donne des valeurs null, sans planter', () => {
	const reponse = {
		status: 1,
		product: { product_name: 'Chocolat en poudre' }
		// pas de brands, pas de quantity, pas de image_url
	};

	assert.deepEqual(convertirProduitOpenFoodFacts(reponse), {
		nom: 'Chocolat en poudre',
		marque: null,
		contenance: null,
		imageUrl: null
	});
});

test('un produit absent de la base (status: 0) est traité comme tel', () => {
	assert.equal(convertirProduitOpenFoodFacts(REPONSE_ABSENTE), null);
});

test('un status: 0 avec un champ product renvoie tout de même null', () => {
	// Défensif : même si un jour l'API renvoyait un "product" à côté d'un
	// status 0, on ne doit pas l'utiliser comme un produit trouvé.
	assert.equal(
		convertirProduitOpenFoodFacts({ status: 0, product: { product_name: 'Fantôme' } }),
		null
	);
});

test('product_name absent est traité comme un produit sans nom exploitable', () => {
	assert.equal(
		convertirProduitOpenFoodFacts({ status: 1, product: { brands: 'Une Marque' } }),
		null
	);
});

test('product_name vide ou uniquement des espaces est traité comme un produit sans nom exploitable', () => {
	assert.equal(convertirProduitOpenFoodFacts({ status: 1, product: { product_name: '' } }), null);
	assert.equal(convertirProduitOpenFoodFacts({ status: 1, product: { product_name: '   ' } }), null);
});

test('une réponse qui ne ressemble à rien ne plante pas', () => {
	assert.equal(convertirProduitOpenFoodFacts(null), null);
	assert.equal(convertirProduitOpenFoodFacts(undefined), null);
	assert.equal(convertirProduitOpenFoodFacts('pas un objet'), null);
	assert.equal(convertirProduitOpenFoodFacts({}), null);
	assert.equal(convertirProduitOpenFoodFacts({ status: 1 }), null);
	assert.equal(convertirProduitOpenFoodFacts({ status: 1, product: 'pas un objet' }), null);
});
