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
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
EXPOSE 5200
CMD ["node", "dist/main"]
