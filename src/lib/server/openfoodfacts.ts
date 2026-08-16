// Client Open Food Facts. Volontairement sans dépendance à Prisma ni à
// SvelteKit ($env, etc.) : reste exécutable et testable par "node --test"
// sans lancer toute l'application (voir openfoodfacts.test.ts).

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
// N'en demande que ce dont on a besoin : la réponse complète fait plusieurs
// centaines de kilooctets. categories_tags est demandé pour un usage futur
// (l'app ne l'exploite pas encore : pas de correspondance fiable entre les
// tags OFF, ex. "en:dairies", et les Categorie.nom locales sans mapping
// explicite, qu'il vaut mieux ne pas inventer).
const CHAMPS = 'product_name,brands,quantity,image_url,categories_tags';
// Format exigé par la politique Open Food Facts : "AppName/Version
// (ContactEmail)". https://openfoodfacts.github.io/openfoodfacts-server/api/
const USER_AGENT = 'Stoguard/0.1 (contact@example.com)';
const DELAI_MS = 5000;

export type ProduitOpenFoodFacts = {
	nom: string;
	marque: string | null;
	contenance: string | null;
	imageUrl: string | null;
};

function texteOuNull(valeur: unknown): string | null {
	if (typeof valeur !== 'string') return null;
	const nettoye = valeur.trim();
	return nettoye === '' ? null : nettoye;
}

/**
 * Conversion pure JSON Open Food Facts -> champs du modèle Produit. Ne fait
 * aucun accès réseau : c'est ce qui la rend testable avec des réponses
 * figées en dur.
 *
 * Renvoie null dans les deux cas où l'API n'apporte rien d'exploitable :
 * "status" différent de 1 (produit absent de leur base), ou un
 * "product_name" vide/absent (fiche existante mais sans nom, inutilisable
 * pour préremplir le formulaire).
 */
export function convertirProduitOpenFoodFacts(reponse: unknown): ProduitOpenFoodFacts | null {
	if (typeof reponse !== 'object' || reponse === null) return null;

	const r = reponse as Record<string, unknown>;
	if (r.status !== 1) return null;

	if (typeof r.product !== 'object' || r.product === null) return null;
	const produit = r.product as Record<string, unknown>;

	const nom = texteOuNull(produit.product_name);
	if (nom === null) return null;

	return {
		nom,
		marque: texteOuNull(produit.brands),
		contenance: texteOuNull(produit.quantity),
		imageUrl: texteOuNull(produit.image_url)
	};
}

/**
 * Appel réseau réel. Ne lève jamais : produit non trouvé, réponse HTTP en
 * erreur, dépassement du délai ou coupure réseau renvoient tous null — dans
 * les trois cas, l'appelant doit pouvoir basculer sur la saisie manuelle
 * sans que ça bloque quoi que ce soit.
 */
export async function recupererProduitOpenFoodFacts(ean: string): Promise<ProduitOpenFoodFacts | null> {
	try {
		const url = `${ENDPOINT}/${encodeURIComponent(ean)}.json?fields=${CHAMPS}`;
		const reponse = await fetch(url, {
			headers: { 'User-Agent': USER_AGENT },
			signal: AbortSignal.timeout(DELAI_MS)
		});

		if (!reponse.ok) return null;

		return convertirProduitOpenFoodFacts(await reponse.json());
	} catch {
		return null;
	}
}
