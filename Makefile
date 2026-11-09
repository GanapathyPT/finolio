# ──────────────────────────────────────────────────────────────────────────────
# Finolio – Makefile (Production-Focused)
# ──────────────────────────────────────────────────────────────────────────────

BUILD_DIR := bin
WEB_DIR   := web
GO        := go

.DEFAULT_GOAL := help

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ── Build (Production) ────────────────────────────────────────────────────────
.PHONY: build docker-build

build: ## Build production Docker image
	docker compose build

docker-build: build ## Alias for build

# ── Containers ────────────────────────────────────────────────────────────────
.PHONY: run stop

run: ## Build and start production container stack
	docker compose up -d --build

stop: ## Stop production container stack
	docker compose down

# ── Test & Quality ────────────────────────────────────────────────────────────
.PHONY: test check

test: ## Run test suite
	$(GO) test -race -count=1 ./...

check: ## Run format check and vet
	@gofmt -l -w .
	$(GO) vet ./...

# ── Housekeeping ──────────────────────────────────────────────────────────────
.PHONY: tidy clean generate

tidy: ## Tidy and verify go modules
	$(GO) mod tidy
	$(GO) mod verify

clean: ## Remove build artifacts and local database files
	@rm -rf $(BUILD_DIR) $(WEB_DIR)/dist coverage.out *.db *.db-wal *.db-shm
	@echo "✓ clean"

generate: ## Regenerate internal/store from db/queries via sqlc
	@command -v sqlc >/dev/null 2>&1 || \
		{ echo "sqlc not found – install from https://docs.sqlc.dev/en/latest/overview/install.html"; exit 1; }
	sqlc generate
	@echo "✓ sqlc generate"
