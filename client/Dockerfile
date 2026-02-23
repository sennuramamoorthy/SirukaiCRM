# ── Stage 1: build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first — Docker layer cache optimisation
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all workspace dependencies
# Using npm install (not npm ci) because no package-lock.json exists yet
RUN npm install

# Copy client source files
COPY client/tsconfig.json ./client/
COPY client/tsconfig.node.json ./client/
COPY client/vite.config.ts ./client/
COPY client/postcss.config.js ./client/
COPY client/tailwind.config.ts ./client/
COPY client/index.html ./client/
COPY client/src ./client/src

# Build production bundle → client/dist/
RUN npm run build --workspace=client


# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config (SPA routing + API reverse proxy)
COPY client/nginx.conf /etc/nginx/conf.d/app.conf

# Copy built static files from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

EXPOSE 8000

CMD ["nginx", "-g", "daemon off;"]
