---
name: goal-hierarchy
description: Use this skill when working on financial goals, sub-goals, hierarchical tree structures, drag-and-drop asset assignment, or goal analytics.
---

# Financial Goals & Asset Allocation System

## Instructions

1. **Hierarchy**: Maintain a parent-child goal hierarchy where deleting a parent cascades to its sub-goals.
2. **Default Seeds**: Automatically seed "Safety Net" and "FIRE" goals whenever a user account has no goals.
3. **Asset Tagging**: Ensure each asset is mapped to at most one goal at a time, allowing assignment and unassignment via dedicated API endpoints.
4. **Dynamic Layout**: Display the unassigned assets sidebar only when unassigned assets exist; hide it completely and give goals full width once all assets are allocated.
5. **Analytics First**: Default each goal card to its analytics overview (invested capital, current corpus, return percentage, target gap, and asset allocation breakdown), keeping asset lists collapsed behind a toggle.

## Constraints

- Never display day's P&L, daily change percentages, or intraday price tickers.
- Keep total invested corpus and overall valuation in a subtle, low-visibility status strip at the bottom of the dashboard.
