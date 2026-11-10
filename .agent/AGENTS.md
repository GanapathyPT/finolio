# Finolio — Agent Guidelines

This document provides high-level principles and directs agents to domain-specific skills for detailed rules and workflows.

---

## 1. Core Principles

- **Git Discipline**: Never commit or push automatically. Only commit or push when explicitly requested by the user. Group changes into logical, cohesive commits.
- **Goal-First Focus**: Finolio is centered on **Financial Goals** and tracking progress towards them—not day-trading or net-worth obsession.
- **Verification**: Always verify changes before declaring a task complete.

---

## 2. Domain Skills & Workflow Routing

For any task, consult and strictly follow the corresponding skill:

| Domain / Task | Relevant Skill | Key Responsibilities & Rules Detailed Therein |
| :--- | :--- | :--- |
| **Database & Schema** | [`db-migration`](.agent/skills/db-migration/SKILL.md) | Schema evolution in `db/schema.sql`, `sqlc` query generation, foreign keys, and migration safety. |
| **Zerodha Kite & Sync** | [`kite-sync-protocol`](.agent/skills/kite-sync-protocol/SKILL.md) | Strictly on-demand sync (no background polling), single combined snapshot, no retries on failure, independent timeout context, and preserving goal asset mappings. |
| **Goals & UI** | [`goal-hierarchy`](.agent/skills/goal-hierarchy/SKILL.md) | Goals tree structure, default seeds ("Safety Net" & "FIRE"), `@dnd-kit/core` drag-and-drop, goal analytics, hiding day's P&L, dynamic unassigned sidebar, and low-visibility totals strip. |
| **Testing & Quality** | [`test-and-verify`](.agent/skills/test-and-verify/SKILL.md) | Backend race tests (`make test`), `go vet`, frontend `oxlint`, `typecheck`, and production bundle builds. |
| **Container & Deploy** | [`container-deploy`](.agent/skills/container-deploy/SKILL.md) | Multi-stage Docker builds, persistent `/data` volume safety, stack lifecycle (`make run`/`make stop`), and `/api/healthz` validation. |
