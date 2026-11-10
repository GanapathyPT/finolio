---
name: goal-hierarchy
description: Use this skill when working on financial goals, sub-goals, hierarchical tree structures, drag-and-drop asset assignment, or goal analytics.
---

# Financial Goals & Asset Allocation System

## Instructions

1. **Hierarchy**: Maintain a parent-child goal hierarchy where deleting a parent cascades to its sub-goals.
2. **Default Seeds**: Automatically seed "Safety Net" and "FIRE" goals whenever a user account has no goals.
3. **Asset Tagging & Multi-Goal Splits**: Support percentage-based asset splitting across multiple goals with a minimum 10% allocation and in multiples of 10% (10%, 20%, ..., 100%), with total allocation not exceeding 100%. Support direct drag-and-drop asset transfers from one goal to another as well as from the unassigned panel.
4. **Dynamic Layout**: Display the unassigned assets sidebar only when unassigned assets exist; hide it completely and give goals full width once all assets are allocated.
5. **Orbital Horizon Arc Analytics Card**: Present each goal's progress in a dedicated Orbital Horizon Arc card: an animated semi-radial gauge with live number count-up, an animated orbital beacon at the active progress frontier, blue arc for invested capital, green/red arc for accumulated P&L, and clear status breakdown. For open-ended goals, the arc displays the wealth anatomy and compounding multiplier. Keep asset lists collapsed behind a toggle.
6. **Inflation Projection**: Financial goal target amounts represent today's purchasing power / cost basis. For goals with a future target date, project the future required corpus adjusted for inflation (defaulting to static 7% p.a., $FV = PV \times (1 + 0.07)^t$). Provide an integrated toggle between Projected Target and Today's Cost in the Horizon Arc card, and show live inflation impact previews when creating or editing goals.

## Constraints

- Never display day's P&L, daily change percentages, or intraday price tickers.
- Do not display progress bars or percentage clutter on the accordion header title (keep header clean and focused on goal identity and actions).
- Do not display holding allocation breakdowns (such as % of stocks vs % of mutual funds).
- Do not label or display 'Goal Returns' (goals represent target corpus vs covered corpus, alongside accumulated asset P&L).
- Keep total invested corpus and overall valuation in a subtle, low-visibility status strip at the bottom of the dashboard.
