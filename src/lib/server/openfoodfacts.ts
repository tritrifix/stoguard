// Client Open Food Facts. Volontairement sans dépendance à Prisma ni à
// SvelteKit ($env, etc.) : reste exécutable et testable par "node --test"
// sans lancer toute l'application (voir openfoodfacts.test.ts).

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
// N'en demande que ce dont on a besoin : la réponse complète fait plusieurs
// centaines de kilooctets. Pas de categories_tags : l'app ne fait pas
// correspondre les tags OFF (ex. "en:dairies") aux Categorie.nom locales —
// un mauvais mappage donnerait un mauvais délai après ouverture, donc un
// mauvais calcul de date effective, et il vaut mieux ne pas le deviner.
const CHAMPS = 'product_name,brands,quantity,image_url';
const DELAI_MS = 5000;
// Format exigé par la politique Open Food Facts : "AppName/Version
// (ContactEmail)", pour pouvoir contacter l'auteur en cas d'usage anormal.
// https://openfoodfacts.github.io/openfoodfacts-server/api/
// Valeur de repli si OFF_CONTACT_EMAIL n'est pas renseigné : ne jamais coder
// en dur une vraie adresse ici, ce fichier est dans un dépôt public.
const CONTACT_PAR_DEFAUT = 'contact@example.com';

function userAgent(contactEmail: string | undefined): string {
	const contact = contactEmail?.trim() || CONTACT_PAR_DEFAUT;
	return `Stoguard/0.1 (${contact})`;
}

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
 *
 * contactEmail vient de OFF_CONTACT_EMAIL (lu par l'appelant, pas ici : ce
 * fichier reste volontairement sans dépendance à $env, voir l'en-tête).
 * Absent ou vide, CONTACT_PAR_DEFAUT est utilisé à la place.
 */
export async function recupererProduitOpenFoodFacts(
	ean: string,
	contactEmail?: string
): Promise<ProduitOpenFoodFacts | null> {
	try {
		const url = `${ENDPOINT}/${encodeURIComponent(ean)}.json?fields=${CHAMPS}`;
		const reponse = await fetch(url, {
			headers: { 'User-Agent': userAgent(contactEmail) },
			signal: AbortSignal.timeout(DELAI_MS)
		});

		if (!reponse.ok) return null;

		return convertirProduitOpenFoodFacts(await reponse.json());
	} catch {
		return null;
	}
}
