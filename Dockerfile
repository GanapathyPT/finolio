# ── Build Stage ──
FROM golang:alpine AS builder

WORKDIR /src

# Pre-fetch dependencies for better build caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build statically linked executable
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o /bin/finolio \
    ./cmd/finolio

# ── Runtime Stage ──
FROM alpine:latest

# Install CA certificates for HTTPS requests (e.g. Zerodha Kite API) and tzdata
RUN apk add --no-cache ca-certificates tzdata

# Create an unprivileged user and persistent database directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /data && chown -R appuser:appgroup /data

WORKDIR /data

COPY --from=builder /bin/finolio /usr/local/bin/finolio

USER appuser

EXPOSE 8080

VOLUME ["/data"]

ENTRYPOINT ["finolio"]

