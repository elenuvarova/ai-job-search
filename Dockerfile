# Stage 1 — build frontend
# No build ARGs/ENVs here: the Vite frontend uses no VITE_* variables, and the
# backend's secrets (Adzuna/Gemini/Groq/Muse keys) are RUNTIME-only. They arrive
# via Coolify runtime env (process.env) and must never be baked into image layers.
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 — install backend production deps
# --omit=optional drops sqlite3 (an optionalDependency used only for LOCAL dev)
# and its native build chain (node-gyp -> cacache -> node-tar), which npm audit
# flags with HIGH advisories. Prod runs on Postgres via the regular `pg` driver,
# so the shipped image never needs sqlite3.
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Stage 3 — runtime
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app/backend
COPY backend/ ./
COPY --from=backend-deps /app/backend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/dist ./public
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1
CMD ["node", "server.js"]
