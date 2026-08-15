# --- Stage 1: build ---
FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Strip devDependencies out of node_modules, keep only what's needed at runtime
RUN npm prune --omit=dev

# --- Stage 2: runtime ---
FROM node:24-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

# "node" is the non-root user baked into the official Node image (uid 1000)
USER node

EXPOSE 3000

CMD ["node", "build/index.js"]
