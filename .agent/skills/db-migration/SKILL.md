---
name: db-migration
description: Use this skill when modifying the database schema, creating or updating tables, writing sqlc queries, or generating Go database models.
---

# Database Schema & sqlc Workflow

## Instructions

1. **Schema**: Maintain `db/schema.sql` as the single source of truth. Add table definitions with explicit constraints, foreign keys, and indexes.
2. **Queries**: Add or update sqlc-annotated queries in `db/queries/`.
3. **Generate**: Run `make generate` to regenerate type-safe Go store models.
4. **Service**: Update domain services and data mapping logic in `internal/` to use the generated methods.
5. **Verify**: Run `make test && make check` to ensure schema validity and test coverage.

## Constraints

- Foreign keys are strictly enforced in SQLite; always specify explicit deletion behaviors (such as cascade or set null).
- Never delete or clear existing goal asset mappings when modifying schema or syncing portfolio data.
