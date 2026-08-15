-- CreateEnum
CREATE TYPE "TypeEmplacement" AS ENUM ('FRIGO', 'CONGELATEUR', 'PLACARD', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeDate" AS ENUM ('DLC', 'DDM');

-- CreateEnum
CREATE TYPE "MotifConsommation" AS ENUM ('CONSOMME', 'JETE_PERIME', 'JETE_AUTRE');

-- CreateTable
CREATE TABLE "Produit" (
    "id" TEXT NOT NULL,
    "ean" TEXT,
    "nom" TEXT NOT NULL,
    "marque" TEXT,
    "contenance" TEXT,
    "imageUrl" TEXT,
    "dateMajCache" TIMESTAMP(3),
    "saisiManuelle" BOOLEAN NOT NULL DEFAULT false,
    "categorieId" TEXT,

    CONSTRAINT "Produit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "delaiApresOuverture" INTEGER,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emplacement" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "TypeEmplacement" NOT NULL,

    CONSTRAINT "Emplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleStock" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "emplacementId" TEXT NOT NULL,
    "quantite" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "dateImprimee" TIMESTAMP(3) NOT NULL,
    "typeDate" "TypeDate" NOT NULL,
    "estOuvert" BOOLEAN NOT NULL DEFAULT false,
    "dateOuverture" TIMESTAMP(3),
    "delaiOuverture" INTEGER,
    "dateAjout" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ArticleStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consommation" (
    "id" TEXT NOT NULL,
    "articleStockId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motif" "MotifConsommation" NOT NULL,
    "quantite" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "Consommation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produit_ean_key" ON "Produit"("ean");

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_nom_key" ON "Categorie"("nom");

-- CreateIndex
CREATE INDEX "ArticleStock_dateImprimee_idx" ON "ArticleStock"("dateImprimee");

-- CreateIndex
CREATE INDEX "ArticleStock_estOuvert_idx" ON "ArticleStock"("estOuvert");

-- AddForeignKey
ALTER TABLE "Produit" ADD CONSTRAINT "Produit_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleStock" ADD CONSTRAINT "ArticleStock_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "Produit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleStock" ADD CONSTRAINT "ArticleStock_emplacementId_fkey" FOREIGN KEY ("emplacementId") REFERENCES "Emplacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consommation" ADD CONSTRAINT "Consommation_articleStockId_fkey" FOREIGN KEY ("articleStockId") REFERENCES "ArticleStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
