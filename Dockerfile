# ==========================================
# 1. Étape de Build (Builder)
# ==========================================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copie des définitions de paquets
COPY package*.json ./

# Installation propre des dépendances (y compris de dev pour le build TypeScript / Tailwind)
RUN npm ci

# Copie de l'ensemble du code source
COPY . .

# Construction de l'application Next.js
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==========================================
# 2. Étape de Production (Runner)
# ==========================================
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Création du dossier data pour la base SQLite persistante
RUN mkdir -p /app/data && chown -R node:node /app/data

# Copie des fichiers compilés et dépendances de production
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.js ./next.config.js

# Exécution sous l'utilisateur non-root 'node' pour la sécurité
USER node

# Port interne du conteneur (sera mappé vers le port de votre choix sur l'hôte)
EXPOSE 3000

# Volume pour conserver vos recettes même après mise à jour du conteneur
VOLUME ["/app/data"]

# Vérification de santé du conteneur (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/recipes').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start"]
