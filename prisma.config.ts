import { config as chargerEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// .env cible le réseau Docker (host "db") : c'est ce dont le conteneur a besoin.
// .env.local, s'il existe, permet à l'outillage lancé depuis la machine hôte de
// viser 127.0.0.1:5432. Il est listé en premier car dotenv donne la priorité au
// premier fichier qui définit une variable.
// Dans l'image Docker aucun des deux n'est présent : DATABASE_URL vient alors
// directement de l'environnement passé par docker compose.
chargerEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
