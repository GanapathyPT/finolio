# ── Stage 1: Build Frontend ──
FROM node:alpine AS frontend-builder

WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

# ── Stage 2: Build Backend ──
FROM golang:alpine AS backend-builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /bin/finolio \
    ./cmd/finolio

# ── Stage 3: Runtime ──
FROM alpine:latest

# Install CA certificates for Zerodha Kite HTTPS requests and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user and directories for SQLite data and static web assets
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /data /app/web/dist && chown -R appuser:appgroup /data /app

WORKDIR /data

COPY --from=backend-builder /bin/finolio /usr/local/bin/finolio
COPY --from=frontend-builder --chown=appuser:appgroup /app/dist /app/web/dist

USER appuser

ENV STATIC_DIR=/app/web/dist

EXPOSE 8080

VOLUME ["/data"]

ENTRYPOINT ["finolio"]
