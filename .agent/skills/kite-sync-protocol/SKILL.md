---
name: kite-sync-protocol
description: Use this skill when implementing or modifying Zerodha Kite Connect integration, authentication sessions, portfolio syncing, or snapshot recording.
---

# Zerodha Kite Sync Protocol

## Instructions

1. **On-Demand Sync**: Synchronize only via explicit user action; never run background polling or scheduled sync jobs.
2. **Atomic Snapshots**: Fetch equity holdings and mutual funds together and record them atomically into a single portfolio snapshot.
3. **Failure Handling**: If any Kite API call fails, record a failed snapshot with the error details and preserve existing holdings without retrying.
4. **Independent Timeout**: Execute the sync within a detached background context with a 30-second timeout so browser reloads or client disconnects do not cancel the database transaction.
5. **Goal Preservation**: Re-link synced holdings to their existing goal assignments matching by symbol and exchange for equities, and folio and fund name for mutual funds.

## Verification

```bash
go test -race -v ./internal/portfolio/...
```
