-- AlterTable
ALTER TABLE "ArticleStock" ADD COLUMN     "dateSortie" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ArticleStock_dateSortie_idx" ON "ArticleStock"("dateSortie");
