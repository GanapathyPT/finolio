# ── Stage 1: Build React Frontend (Production) ──
FROM node:26.13.0-alpine3.24 AS frontend-builder

WORKDIR /app

# Install dependencies (including devDependencies required for vite build)
COPY web/package*.json ./
RUN npm ci --include=dev

# Copy source files and compile production bundle
COPY web/ .
RUN NODE_ENV=production npm run build

# ── Stage 2: Build Go Backend (Production) ──
FROM golang:1.27.3-alpine3.24 AS backend-builder

WORKDIR /src

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build optimized, statically-linked binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /bin/finolio \
    ./cmd/finolio

# ── Stage 3: Hardened Alpine Production Runtime ──
FROM alpine:3.24.4

# Upgrade system packages, install minimal certificates & timezone, clean all caches
RUN apk update && apk upgrade --no-cache \
    && apk add --no-cache ca-certificates tzdata \
    && rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Remove all SUID/SGID bits to eliminate privilege escalation vectors
RUN find / -xdev -perm /6000 -type f -exec chmod a-s {} + 2>/dev/null || true

# Create a fixed, unprivileged system user and group (no login shell, no home dir)
RUN addgroup -g 10001 -S finolio \
    && adduser -u 10001 -S -G finolio -H -h /data -s /sbin/nologin finolio

# Set up isolated directories with minimal access permissions:
# - /data: writable only by finolio (0750) for SQLite persistence
# - /app/web/dist: read-only directory for static web files
RUN mkdir -p /data /app/web/dist \
    && chown -R finolio:finolio /data \
    && chmod 0750 /data \
    && chmod -R 0555 /app

# Copy binary (owned by root, read-execute only, not writable)
COPY --from=backend-builder --chmod=0555 /bin/finolio /usr/local/bin/finolio

# Copy compiled frontend assets (read-only for security)
COPY --from=frontend-builder --chmod=0555 /app/dist /app/web/dist

# Drop all privileges to the non-root user (numeric ID for container security standards)
USER 10001:10001

WORKDIR /data

EXPOSE 8080

VOLUME ["/data"]

# Native container healthcheck (uses HTTP_PORT if provided by user, defaults to 8080)
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O - "http://127.0.0.1:${HTTP_PORT:-8080}/api/healthz" > /dev/null 2>&1 || exit 1

ENTRYPOINT ["/usr/local/bin/finolio"]
