-- CreateTable
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "motDePasseHash" TEXT NOT NULL,
    "versionSession" INTEGER NOT NULL DEFAULT 1,
    "dateMaj" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);
