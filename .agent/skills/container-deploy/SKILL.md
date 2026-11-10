---
name: container-deploy
description: Use this skill when building, running, verifying, or troubleshooting the production Docker container stack.
---

# Production Container Operations

## Commands

```bash
make run    # Build and start container stack
make stop   # Stop container stack
```

## Health Verification

```bash
docker ps --filter "name=finolio"
curl -f http://localhost:8080/api/healthz
```

## Instructions & Constraints

- Preserve the persistent SQLite database directory on `/data`; never remove, reinitialize, or prune this volume during routine updates or restarts.
- Maintain a self-contained multi-stage Docker build packaging both the compiled Go backend and the Vite static assets.
- Ensure the container health check reliably monitors the service status before serving traffic.
