# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-bookworm-slim AS base
WORKDIR /app

# ---- deps: full install (dev+prod), cached on lockfile ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- dev: hot-reload image (compose default target) ----
FROM deps AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 5200
CMD ["npm", "run", "dev"]

# ---- build: compile TS -> dist ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- prod-deps: production-only node_modules ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- prod: lean runtime ----
FROM base AS prod
ENV NODE_ENV=production
# --chown so the unprivileged user can read what it runs. Nothing is written
# at runtime, so none of it needs to be writable.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# The node image ships an unprivileged `node` user; nothing here needs root.
USER node
EXPOSE 5200
# Node's built-in fetch, since bookworm-slim ships neither curl nor wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5200)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/main"]
