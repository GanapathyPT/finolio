# ──────────────────────────────────────────────────────────────────────────────
# Finolio – Makefile
# ──────────────────────────────────────────────────────────────────────────────

# Project settings
CMD_PATH    := ./cmd/finolio
BINARY_NAME := finolio
BUILD_DIR   := bin

# Go toolchain
GO := go

# Dev build: race detector, full debug info, no stripping
GOFLAGS_DEV  := -race -gcflags="all=-N -l"

# Prod build: fully optimised, symbols and debug info stripped
GOFLAGS_PROD := -ldflags="-s -w"

.DEFAULT_GOAL := help

# ──────────────────────────────────────────────────────────────────────────────
# Help
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ──────────────────────────────────────────────────────────────────────────────
# Build
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: build build-dev build-prod

build: build-dev ## Alias for build-dev

build-dev: ## Build with race detector, no stripping (dev mode)
	@echo "→ Building (dev) …"
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS_DEV) -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_PATH)
	@echo "✓ $(BUILD_DIR)/$(BINARY_NAME)"

build-prod: ## Build fully optimised binary (prod mode)
	@echo "→ Building (prod) …"
	@mkdir -p $(BUILD_DIR)
	$(GO) build $(GOFLAGS_PROD) -o $(BUILD_DIR)/$(BINARY_NAME) $(CMD_PATH)
	@echo "✓ $(BUILD_DIR)/$(BINARY_NAME)"

# ──────────────────────────────────────────────────────────────────────────────
# Run
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: run
run: ## Build (dev) and run the application
	@$(MAKE) build-dev
	@echo "→ Running …"
	./$(BUILD_DIR)/$(BINARY_NAME)

# ──────────────────────────────────────────────────────────────────────────────
# Code quality
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: fmt vet lint check

fmt: ## Run gofmt over all source files
	@echo "→ fmt …"
	@gofmt -l -w .
	@echo "✓ fmt"

vet: ## Run go vet over all packages
	@echo "→ vet …"
	$(GO) vet ./...
	@echo "✓ vet"

lint: ## Run golangci-lint (install: https://golangci-lint.run/usage/install/)
	@echo "→ lint …"
	@command -v golangci-lint >/dev/null 2>&1 || \
		{ echo "golangci-lint not found – install from https://golangci-lint.run/usage/install/"; exit 1; }
	golangci-lint run ./...
	@echo "✓ lint"

check: fmt vet lint ## Run fmt + vet + lint in sequence

# ──────────────────────────────────────────────────────────────────────────────
# Test
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: test test-cover

test: ## Run all tests with race detector
	$(GO) test -race -count=1 ./...

test-cover: ## Run tests and open HTML coverage report
	$(GO) test -race -count=1 -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out

# ──────────────────────────────────────────────────────────────────────────────
# Housekeeping
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: tidy clean

tidy: ## Tidy and verify go.mod / go.sum
	$(GO) mod tidy
	$(GO) mod verify

# ──────────────────────────────────────────────────────────────────────────────
# Code generation
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: generate

generate: ## Run sqlc to regenerate internal/store from db/queries (requires sqlc CLI)
	@command -v sqlc >/dev/null 2>&1 || \
		{ echo "sqlc not found – install from https://docs.sqlc.dev/en/latest/overview/install.html"; exit 1; }
	sqlc generate
	@echo "✓ sqlc generate"

clean: ## Remove build artefacts and local database files
	@rm -rf $(BUILD_DIR) coverage.out *.db *.db-wal *.db-shm
	@echo "✓ clean"

# ──────────────────────────────────────────────────────────────────────────────
# Web (Vite + React + TypeScript)
# ──────────────────────────────────────────────────────────────────────────────
WEB_DIR := web

.PHONY: web-install web-dev web-build web-typecheck web-lint

web-install: ## Install web dependencies
	cd $(WEB_DIR) && npm install

web-dev: ## Start the Vite dev server (proxies /api to :8080)
	cd $(WEB_DIR) && npm run dev

web-build: ## Build the web app for production (output: web/dist)
	cd $(WEB_DIR) && npm run build

web-typecheck: ## Run TypeScript type-checking without emitting files
	cd $(WEB_DIR) && npm run typecheck

web-lint: ## Run oxlint over the web source
	cd $(WEB_DIR) && npm run lint

# ──────────────────────────────────────────────────────────────────────────────
# Docker
# ──────────────────────────────────────────────────────────────────────────────
.PHONY: docker-build docker-up docker-down docker-logs

docker-build: ## Build docker images for backend and frontend
	docker compose build

docker-up: ## Start application services locally with docker compose
	docker compose up -d

docker-down: ## Stop local docker compose application services
	docker compose down

docker-logs: ## Tail docker compose logs
	docker compose logs -f

