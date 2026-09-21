# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# mediasoup requires build tools for native addon; ffmpeg for server-side recording
RUN apk add --no-cache python3 make g++ linux-headers ffmpeg

# Copy only production deps and compiled output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY package.json ./

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4001
# Expose mediasoup UDP port range (must match .env)
EXPOSE 40000-49999/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4001/health/ready || exit 1

CMD ["node", "dist/server.js"]
