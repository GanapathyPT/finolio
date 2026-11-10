---
name: test-and-verify
description: Use this skill to run the full verification pipeline including backend race tests, go vet, frontend oxlint, TypeScript typechecks, and production build checks.
---

# Quality & Verification Protocol

Run these checks before declaring tasks complete or requesting commits:

## 1. Backend

```bash
make test    # go test -race -count=1 ./...
make check   # go vet and gofmt
```

## 2. Frontend

```bash
cd web
npm run lint         # oxlint src (must pass with 0 errors)
npm run typecheck    # tsc -b --noEmit
npm run build        # production vite build
```

## 3. Container Smoke Test (When Applicable)

```bash
make run
curl -f http://localhost:8080/api/healthz
```
