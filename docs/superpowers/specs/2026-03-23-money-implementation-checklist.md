# Money Implementation Checklist

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Build order, dependencies, and definition-of-done for Ink's money layer v1

---

## Goal

Build the smallest complete version of Ink's money layer that can:

- give a daily money read
- support a few tactile money actions
- connect financial pressure to the day when it matters
- avoid drifting into budgeting or bookkeeping software

This checklist is sequenced to validate the product quickly, not to maximize infrastructure purity.

---

## Phase 1 — Concept Feed and Surface Stability

### 1. Provider setup

- [x] Add provider seam for financial data
- [x] Allow Monarch as concept-stage source
- [x] Add provider selection in settings
- [x] Add secure Monarch token storage
- [ ] Verify Monarch token flow end-to-end with real data
- [ ] Confirm refresh behavior and failure states with real account data

**Done when:**

- Ink can load balances and transactions from Monarch
- the Money view can refresh without crashing
- the app handles missing/invalid token states cleanly

### 2. Shared money copy layer

- [x] Extract shared copy helpers for brief language
- [x] Reuse same money language in Morning and Money surfaces
- [ ] Review copy against actual live data to remove weird phrasing

**Done when:**

- morning block and Money brief say the same kind of thing
- no duplicate business logic exists across surfaces

### 3. Brief/detail split in Money view

- [x] Add brief/detail mode split
- [x] Make brief the default entry
- [ ] Tighten visual hierarchy so detail reads as secondary
- [ ] Add state-specific styling for calm / warning / compressed

**Done when:**

- opening Money feels like receiving a read, not entering a dashboard
- detail feels optional and deliberate

---

## Phase 2 — Daily Read Quality

### 4. Morning money block

- [x] Add compact money read to morning sidebar
- [ ] Tune spacing and density against real morning layout
- [ ] Confirm it helps rather than competes with calendar/awareness blocks
- [ ] Decide whether it belongs in sidebar only or also in main conversation body later

**Done when:**

- the morning money block feels native to Ink
- it is readable in one glance
- it does not feel like a mini finance widget

### 5. Daily brief states

- [ ] Implement explicit state mapping for:
  - calm
  - warning
  - compressed
- [ ] Tune position-line logic against real scenarios
- [ ] Tune `Today's Call` logic to avoid generic recommendation sludge
- [ ] Tune `Work Tie-In` logic so it appears only when truly relevant

**Done when:**

- each state has a distinct feel
- the brief is concise but not vague
- the brief does not overreact to minor noise

### 6. Freshness and confidence behavior

- [ ] Define freshness thresholds for Monarch concept feed
- [ ] Add visible but quiet freshness messaging
- [ ] Add confidence hedging when data is stale or inferred
- [ ] Add graceful empty/uncertain language

**Done when:**

- Ink can say "I know this" versus "this may be stale" cleanly
- the app never pretends certainty it does not have

---

## Phase 3 — Tactile Money Objects

### 7. Obligation model cleanup

- [ ] Stop treating recurring-feed items as fully trusted obligations
- [ ] Add certainty states:
  - confirmed
  - inferred
  - watch
- [ ] Improve due-date handling for inferred obligations
- [ ] Separate real obligation object from source-specific recurring item

**Done when:**

- "Next Up" is honest
- obligations do not silently fake certainty
- due dates make sense to a human reader

### 8. Tactile action layer

- [ ] Define 3-5 action types for v1:
  - pay
  - hold
  - move
  - follow up
  - review
- [ ] Add lightweight UI treatment for actions in detail view
- [ ] Add mark-done / dismiss / handled state where useful
- [ ] Ensure actions are finite, consequential, and human-readable

**Done when:**

- the user can touch one real money move
- actions feel handleable, not managerial

### 9. Expected inflows

- [ ] Decide minimal v1 inflow input path
  - manual entry
  - imported stub
  - seeded examples
- [ ] Add inflow display in detail view
- [ ] Connect inflows to `Work Tie-In` logic

**Done when:**

- the product is not purely threat-based
- revenue-related work can show up as money-relevant when needed

---

## Phase 4 — Detail View Refinement

### 10. Accounts section

- [ ] Review whether balances shown are the right balances for each account type
- [ ] Simplify account presentation
- [ ] Remove any visual noise that reads like fintech dashboarding

**Done when:**

- the section is useful for verification
- it does not become the center of gravity

### 11. Upcoming section

- [ ] Improve sort order by consequence before chronology
- [ ] Add certainty badges or copy treatment
- [ ] Add coverage state treatment:
  - covered
  - watch
  - not covered

**Done when:**

- the user can instantly tell what matters
- the list is readable without decoding

### 12. Spending snapshot

- [ ] Keep buckets coarse
- [ ] Confirm categories from source map cleanly into useful buckets
- [ ] Remove any temptation toward category-management UI

**Done when:**

- spending gives context without pulling the product toward budgeting

---

## Phase 5 — Product Truth and Source Evolution

### 13. Real-use testing

- [ ] Use the money brief for real days
- [ ] Notice when it helps
- [ ] Notice when it feels false
- [ ] Notice when it triggers checking anyway
- [ ] Notice what actions you actually want to take

**Done when:**

- you can describe the use case from lived behavior, not theory

### 14. Decide final source strategy

After actual use:

- [ ] keep Monarch as concept feed only
- [ ] move to Plaid for live-data layer
- [ ] decide whether a separate obligations model becomes primary
- [ ] decide whether YNAB is useful as optional import, not backbone

**Done when:**

- source choice follows product truth instead of leading it

---

## Explicit Non-Goals During Build

Do not build these while v1 is still taking shape:

- category budgeting
- transaction reconciliation
- monthly planning tables
- net worth surfaces
- debt payoff tools
- dense analytics panels
- behavioral scoring theater

If a task starts drifting toward any of these, it should be cut or deferred.

---

## Suggested Build Order

If implemented in the right order, the next moves are:

1. Verify Monarch concept feed with real data
2. Refine morning money block against actual use
3. Refine brief state logic
4. Clean up obligation certainty and due-date honesty
5. Add tactile action handling
6. Add expected inflows
7. Refine detail view
8. Only then revisit long-term source architecture

---

## Definition of V1 Done

V1 is done when all of this is true:

- opening Ink gives a believable money read
- the morning briefing includes money naturally
- the Money view brief is the primary surface
- detail exists for verification but is not required daily
- the app can suggest one real next money move
- obligations feel honest enough to trust
- the product does not make the user do daily bookkeeping to benefit from it

If those are true, v1 is real even if the data plumbing is still provisional.
