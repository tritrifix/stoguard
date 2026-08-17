-- AlterTable
ALTER TABLE "Configuration" ADD COLUMN     "derniereNotificationEnvoyee" TIMESTAMP(3),
ADD COLUMN     "heureNotification" INTEGER NOT NULL DEFAULT 9;

-- CreateTable
CREATE TABLE "AbonnementPush" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbonnementPush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbonnementPush_endpoint_key" ON "AbonnementPush"("endpoint");
