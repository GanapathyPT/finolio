# Finolio

Finolio is a financial portfolio application featuring a Go backend (chi router, SQLite database, Zerodha Kite Connect authentication) and a React/TypeScript frontend (Vite).

## Project Layout

```
finolio/
├── cmd/
│   └── finolio/
│       └── main.go          # Entry point: signal handling, config, app run
├── internal/
│   ├── app/
│   │   └── app.go           # Subsystem orchestration and graceful shutdown
│   ├── auth/
│   │   └── handler.go       # Zerodha Kite Connect OAuth handlers
│   ├── config/
│   │   └── config.go        # Environment-based configuration (hardcoded DB file & timeouts)
│   ├── database/
│   │   └── database.go      # SQLite database connection & schema initialization
│   ├── server/
│   │   └── server.go        # HTTP server with chi router (under /api)
│   └── store/
│       ├── db.go            # Queries wrapper around *sql.DB
│       ├── models.go        # Go data models (users, kite_sessions)
│       └── queries.go       # Type-safe queries
├── db/
│   ├── schema.sql           # SQLite table definitions
│   └── queries/             # sqlc source queries
│       ├── users.sql
│       └── kite_sessions.sql
├── web/                     # React + TypeScript + Vite frontend
│   ├── src/
│   │   ├── App.tsx          # Login & main interface
│   │   └── main.tsx
│   ├── vite.config.ts       # Dev proxy to forward /api to :8080
│   └── package.json
├── Makefile                 # Automation targets for Go and Web
├── sqlc.yaml                # sqlc configuration (engine: sqlite)
├── go.mod
├── go.sum
└── .gitignore
```

## Backend API Routes

All backend routes are served under the `/api` prefix:

- `GET /api/healthz` — Service health and build info
- `GET /api/auth/login` — Redirects browser to Zerodha Kite login (supports optional `?redirect_to=` with frontend serving URL)
- `GET /api/auth/callback` — Exchanges `request_token` for Kite session, stores user/session in SQLite, and redirects back to `redirect_to` origin

## Configuration

All configuration is loaded via environment variables (with no ldflags injection). Timeouts and the database file (`finolio.db`) use default constants.

| Env Var | Required | Default | Description |
|---|---|---|---|
| `KITE_API_KEY` | **Yes** | — | Zerodha Kite Connect API key |
| `KITE_API_SECRET` | **Yes** | — | Zerodha Kite Connect API secret |
| `HTTP_HOST` | No | `0.0.0.0` | HTTP listen address |
| `HTTP_PORT` | No | `8080` | HTTP listen port |
| `APP_ENV` | No | `development` | Deployment environment |
| `APP_VERSION` | No | `dev` | Application version |
| `APP_COMMIT` | No | `unknown` | VCS commit hash |
| `APP_BUILD_TIME` | No | `unknown` | RFC 3339 build timestamp |
| `LOG_LEVEL` | No | `info` | Structured logger level |
| `DB_FILE` | No | `finolio.db` | SQLite database file path |
| `STATIC_DIR` | No | `web/dist` | Directory containing static web assets to serve |

## Running Locally with Docker

1. Copy `.env.example` to `.env` and set your Zerodha Kite credentials:
   ```bash
   cp .env.example .env
   ```
2. Build and start the service using Docker Compose:
   ```bash
   docker compose up -d
   # or: make docker-up
   ```
3. Open the application:
   - Web App & API: `http://localhost:8080` (or `http://localhost:8080/api/healthz`)
4. Stop the service:
   ```bash
   docker compose down
   # or: make docker-down
   ```

SQLite database data is persisted automatically in the `finolio_data` Docker volume.

## Make Targets

### Backend

| Target | Description |
|---|---|
| `make run` | Build (dev) and run backend |
| `make build` / `make build-dev` | Build binary with race detector and symbols preserved |
| `make build-prod` | Build optimized binary with symbols stripped (`-s -w`) |
| `make fmt` | Format Go sources (`gofmt`) |
| `make vet` | Run `go vet` across all packages |
| `make lint` | Run `golangci-lint` (must be installed) |
| `make check` | Run `fmt`, `vet`, and `lint` |
| `make test` | Run tests with race detector |
| `make test-cover` | Run tests with HTML coverage report |
| `make generate` | Run `sqlc generate` to refresh `internal/store` |
| `make tidy` | Tidy and verify `go.mod` / `go.sum` |
| `make clean` | Remove build artefacts and local SQLite databases |

### Frontend (`web/`)

| Target | Description |
|---|---|
| `make web-install` | Install npm packages in `web/` |
| `make web-dev` | Start Vite dev server on `:5173` (proxies `/api` to `:8080`) |
| `make web-build` | Build production bundle in `web/dist` |
| `make web-typecheck` | Run TypeScript type checks (`tsc --noEmit`) |
| `make web-lint` | Run `oxlint` on web code |

### Docker

| Target | Description |
|---|---|
| `make docker-build` | Build backend and frontend Docker images |
| `make docker-up` | Start application stack with Docker Compose |
| `make docker-down` | Stop running Docker Compose containers |
| `make docker-logs` | Stream Docker Compose service logs |

