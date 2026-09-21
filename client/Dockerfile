# ── Build SPA ─────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY excalidraw.tgz ./
RUN npm ci

COPY . .

# Empty = same-origin (nginx proxies API). Override for split-host deploys.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_FRONTEND_URL=
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL

RUN npm run build

# ── Nginx ─────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production
# Self-signed cert with IP SAN so https://46.246.120.148:8981 can terminate TLS.
# Browsers will warn until this is replaced with a CA cert for a real hostname.
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
         -keyout /etc/nginx/certs/server.key \
         -out /etc/nginx/certs/server.crt \
         -subj "/CN=46.246.120.148" \
         -addext "subjectAltName=IP:46.246.120.148"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
