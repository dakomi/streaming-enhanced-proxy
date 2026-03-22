# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

# Install native deps (better-sqlite3 needs build tools in Alpine)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY scripts/ ./scripts/
COPY src/server/admin/ ./dist/server/admin/

# Runtime directories
RUN mkdir -p certs data

EXPOSE 3000 8080

ENV NODE_ENV=production \
    ADMIN_PORT=3000 \
    PROXY_PORT=8080 \
    SCRIPTS_DIR=/app/scripts \
    CERTS_DIR=/app/certs \
    DATA_DIR=/app/data \
    ADMIN_ORIGIN=http://streamingenhanced.local

CMD ["node", "dist/index.js"]
