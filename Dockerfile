# --- Stage 1: build ---
FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
# "postinstall": "prisma generate" a besoin du schema et de prisma.config.ts
# pendant "npm ci" ci-dessous : on les copie donc avant, pas après.
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

# Strip devDependencies out of node_modules, keep only what's needed at runtime.
# "prisma" (le CLI) reste : il est déclaré en dependency (pas devDependency)
# car l'entrypoint en a besoin au démarrage pour "prisma migrate deploy".
RUN npm prune --omit=dev

# --- Stage 2: runtime ---
FROM node:24-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# node:24-slim n'embarque pas openssl : le moteur Prisma (schema-engine, utilisé
# par "prisma migrate deploy") ne peut alors pas détecter la version de libssl
# et se rabat sur une hypothèse par défaut potentiellement fausse.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
# Nécessaires à "prisma migrate deploy" au démarrage du conteneur.
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=node:node /app/prisma ./prisma
# L'application n'en a pas besoin (Vite inline le client généré dans build/),
# mais prisma/seed.ts est exécuté directement par node et l'importe.
COPY --from=builder --chown=node:node /app/generated ./generated
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# "node" is the non-root user baked into the official Node image (uid 1000)
USER node

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "build/index.js"]
