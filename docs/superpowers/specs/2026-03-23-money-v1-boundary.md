# Money V1 Boundary

**Date:** 2026-03-23
**Status:** Draft
**Scope:** V1 feature list, anti-feature list, and product boundary for Ink's money layer

---

## North Star

Inked money is a daily financial orientation layer for someone who tends to avoid, over-check, or get trapped by finance tools. It does three things:

- gives a calm first read of the day
- offers a small number of tactile money moves that feel handleable
- translates financial pressure into work priority when it actually matters

It is not a budgeting system, not a ledger, and not a reconciliation ritual.

Its job is to keep the user in contact with financial reality without making financial reality harder to touch.

---

## V1 Success Condition

V1 succeeds if the user can open Ink, understand today's money situation quickly, and take one meaningful action without falling into a larger finance-management spiral.

That means the product must:

- reduce compulsive checking
- reduce avoidance
- create tolerable contact with money
- make next actions clearer
- feel like Ink, not like imported finance software

---

## V1 Must-Haves

These are the features that belong in v1 because they directly support the product's job.

### 1. Daily money brief

The core surface.

Must include:

- `Available today`
- one position line
- `Next Up`
- `Today's Call`
- optional `Work Tie-In`

Why it belongs:

- gives the first read
- reduces checking
- creates a daily relationship with the feature

### 2. Morning money block

A compact version of the brief inside the morning flow.

Must include:

- available today
- next pressure point
- today's call

Why it belongs:

- makes money part of the day, not a separate event
- keeps the product aligned with Ink's core daily rhythm

### 3. Money detail view

A secondary inspection layer behind the brief.

Must include:

- accounts
- upcoming obligations
- expected inflows
- spending snapshot
- actions

Why it belongs:

- builds trust
- supports intentional inspection
- keeps the brief from needing to carry everything

### 4. Tactile action list

A short list of money moves the user can understand and complete.

Examples:

- send invoice follow-up
- pay this bill
- move money
- hold spending
- review this charge

Why it belongs:

- gives the user something concrete to do
- reduces helplessness
- turns pressure into action

### 5. Upcoming obligations model

Ink needs a concept of what is coming up.

Must support:

- amount
- due date or expected date
- certainty
- covered / watch / not covered

Why it belongs:

- "what's next" is central to the brief
- without this, the app becomes a balance viewer

### 6. Expected inflows

A way to represent money expected to arrive, especially when tied to work.

Must support:

- source / description
- amount
- expected date
- confidence

Why it belongs:

- prevents the product from being purely threat-oriented
- ties money back to work honestly

### 7. Confidence / freshness signaling

The app must know when its read is solid and when it is not.

Must support:

- freshness of source data
- confidence language when obligations are inferred
- graceful degradation when data is stale

Why it belongs:

- protects trust
- prevents false certainty

---

## V1 Nice-to-Haves

These are useful, but should not distort the build.

### 1. Brief/detail mode memory

Remember whether the user last left the Money view on brief or detail.

### 2. Manual obligation confirmation

Allow the user to confirm or edit an inferred obligation without forcing a whole setup ritual.

### 3. Manual inflow entry

A lightweight way to add "invoice sent" or "payment expected" items.

### 4. Gentle stale-data prompt

If the underlying source is getting too stale, prompt a short reset without sounding punishing.

### 5. Lightweight action completion

Mark a money action done inside Ink without turning it into task management infrastructure.

---

## V1 Anti-Features

These are the things that do **not** belong in v1, even if they sound adjacent or useful.

### 1. Full budgeting

No envelope management. No target setting by category. No monthly planning tables.

Why it stays out:

- turns the feature into YNAB-adjacent overhead
- increases maintenance burden
- invites guilt and over-management

### 2. Transaction feed as a primary surface

No endless list of merchants and charges in the default flow.

Why it stays out:

- encourages checking behavior
- overwhelms the user
- shifts the product from interpretation to inspection

### 3. Reconciliation workflow

No "clear," "match," or bookkeeping mechanics in v1.

Why it stays out:

- too close to the tools the user already avoids
- changes the emotional contract of the product

### 4. Dense category systems

No giant category matrices, rule builders, or precision taxonomy work.

Why it stays out:

- abstraction overload
- more maintenance than value
- solves a different problem

### 5. Net worth / wealth tracking

No portfolio or "how much am I worth?" framing in v1.

Why it stays out:

- emotionally noisy
- not relevant to daily orientation
- shifts the product into a different psychological terrain

### 6. Debt optimization tools

No payoff calculators, APR strategy simulators, or debt snowball/avalanche machinery.

Why it stays out:

- high complexity
- low relevance to the daily use case
- easily becomes finance-software cosplay

### 7. Auto-generated financial over-advice

No stacks of recommendations. No "insights" carousel. No generic optimization chatter.

Why it stays out:

- creates noise
- erodes trust
- feels like commodity fintech language

### 8. Daily bookkeeping ritual

No requirement that the user update categories, clear transactions, or maintain system hygiene every day.

Why it stays out:

- directly conflicts with the product's reason for existing
- recreates the anxiety loop we are trying to avoid

---

## Product Rules

These rules should govern decisions during implementation.

### 1. Summary before system

The first thing the user sees must be a read, not a workflow.

### 2. One real action beats five abstract insights

If the app can only do one useful thing, it should make the next money move obvious.

### 3. No feature that makes avoidance worse

If a feature increases dread, bookkeeping load, or compulsive checking, it should be cut or reworked.

### 4. No feature that requires perfect data to be useful

Ink should still help even when the source is imperfect or stale. It should simply lower confidence and narrow its claims.

### 5. Tactility matters

The product should let the user touch small, meaningful money objects:

- this bill
- this invoice
- this action
- this pressure point

It should not force the user into abstract financial control panels.

---

## What V1 Actually Is

If stripped to the essentials, V1 is:

- a morning money read
- a brief money view
- a detail inspection layer
- a simple obligations model
- a simple inflows model
- a finite action layer

That is enough to test the real use case.

---

## What We Are Explicitly Not Building Yet

To avoid drift, these should be considered out of scope unless the product direction changes:

- replacing YNAB completely
- replacing Monarch completely
- becoming a full financial command center
- making the user maintain a daily finance system
- becoming a rich forecasting product
- becoming a full business accounting layer

---

## Recommendation

Build the smallest version that can honestly say:

> Here is where you stand today.  
> Here is what matters next.  
> Here is the one move to make.  
> Here is how money changes the day, if it does.

Everything outside that should be treated with suspicion until the product has earned the right to grow.
