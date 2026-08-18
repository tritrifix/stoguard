import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

// Ce script tourne hors SvelteKit (invoqué par la CLI Prisma) : il lit donc
// process.env directement, alimenté par prisma.config.ts.
const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

const categories = [
	{ nom: 'Produits laitiers', delaiApresOuverture: 3 },
	{ nom: 'Charcuterie', delaiApresOuverture: 3 },
	{ nom: 'Plats préparés', delaiApresOuverture: 2 },
	{ nom: 'Jus et boissons ouvertes', delaiApresOuverture: 5 },
	{ nom: 'Conserves ouvertes', delaiApresOuverture: 3 },
	{ nom: 'Sauces et condiments', delaiApresOuverture: 30 },
	{ nom: 'Confitures', delaiApresOuverture: 30 },
	{ nom: 'Épicerie sèche', delaiApresOuverture: null },
	{ nom: 'Surgelés', delaiApresOuverture: null },
	{ nom: 'Fruits et légumes', delaiApresOuverture: null },
	{ nom: 'Autre', delaiApresOuverture: null }
];

const emplacements = [
	{ nom: 'Réfrigérateur', type: 'FRIGO' },
	{ nom: 'Congélateur', type: 'CONGELATEUR' },
	{ nom: 'Placard', type: 'PLACARD' },
	{ nom: 'Cave', type: 'AUTRE' }
] as const;

// Les upsert portent sur "nom", unique dans les deux tables : relancer le seed
// réaligne les valeurs existantes au lieu de créer des doublons.
for (const categorie of categories) {
	await prisma.categorie.upsert({
		where: { nom: categorie.nom },
		update: { delaiApresOuverture: categorie.delaiApresOuverture },
		create: categorie
	});
}

for (const emplacement of emplacements) {
	await prisma.emplacement.upsert({
		where: { nom: emplacement.nom },
		update: { type: emplacement.type },
		create: emplacement
	});
}

// Correction ponctuelle de deux fiches produit réelles restées sans
// catégorie à cause du bug de persistance corrigé dans /ajouter (la
// catégorie choisie au formulaire n'était jamais reportée sur une fiche
// Produit déjà existante). Ne touche que les fiches encore sans catégorie :
// relancer le seed n'écrase jamais une correction faite depuis via
// /article/[id]/modifier.
const correctionsCategories = [
	{ ean: '3017620422003', categorieNom: 'Confitures' }, // Nutella
	{ ean: '5449000000996', categorieNom: 'Jus et boissons ouvertes' } // Coca-Cola 33cl
];

for (const { ean, categorieNom } of correctionsCategories) {
	const categorie = await prisma.categorie.findUnique({ where: { nom: categorieNom } });
	if (!categorie) continue;

	const { count } = await prisma.produit.updateMany({
		where: { ean, categorieId: null },
		data: { categorieId: categorie.id }
	});
	if (count > 0) {
		console.log(`Catégorie « ${categorieNom} » appliquée à l'EAN ${ean}.`);
	}
}

console.log(
	`Seed terminé : ${categories.length} catégories, ${emplacements.length} emplacements.`
);

await prisma.$disconnect();
