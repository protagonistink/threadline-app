# Daily Money Brief — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Product contract for Ink's financial layer, daily brief behavior, source-of-truth rules, v1 data model

---

## Context

Inked is not a budgeting app and should not drift into becoming one.

Monarch already serves the "full financial picture" role. Ink serves a different role: daily operational clarity. It should tell you what money is available, what pressure is approaching, and what action matters today, without inviting compulsive checking or exposing a full ledger by default.

The product goal is restraint, not completeness.

**What Ink's money layer is:** a daily financial brief that supports work decisions.

**What it is not:** a place to reconcile transactions, manage categories in detail, inspect net worth, or replicate Monarch.

---

## Product Promise

Ink should answer one question cleanly:

> "What do I actually need to know about money today so I can make sane decisions and get the right work done?"

Every financial surface should support that question. If a feature does not improve daily awareness, reduce avoidance, or clarify action, it does not belong in v1.

The default experience is a brief, not a dashboard.

---

## Core Use Case

The user is prone to over-checking money. Ink should reduce that reflex by replacing ambient financial monitoring with one intentional daily read.

The daily money brief exists to:

- show today's real cash position
- surface the next obligations that matter
- identify short-term mismatch between available cash and upcoming pressure
- tie money pressure to work priorities when appropriate
- reduce the need to open Monarch or inspect accounts repeatedly

The daily money brief does **not** exist to:

- show every transaction
- optimize category budgets
- provide full-month planning
- provide debt strategy tooling
- become the canonical historical record

---

## Product Principles

### 1. Summary first, ledger later

The first surface should be a concise brief. Detailed account or spend views should require an explicit choice to open them.

### 2. Signal over completeness

If the system cannot support a strong claim honestly, it should make a weaker claim. Better to say "likely due next week" than to pretend a recurring stream is a confirmed bill date.

### 3. Restraint by design

The money layer should be useful without becoming addictive. No endless scrolling transaction feed. No default "refresh everything" behavior. No ambient panic interface.

### 4. Work relevance

Financial information matters in Ink because it affects what work needs to happen now. When money pressure changes today's priorities, the brief should say so plainly.

### 5. Clear source boundaries

The system must always distinguish between:

- **Observed** — directly retrieved from Plaid or explicit user entry
- **Inferred** — estimated from recurring streams or behavioral patterns
- **Suggested** — system-generated actions or risk calls

This distinction is product-critical. The user should never be asked to trust a fiction presented as fact.

---

## Recommended Provider Decision

Ink should use Plaid directly as the financial data source.

Monarch's unofficial API should not be the dependency for Ink's money layer. Monarch is the user's full finance environment. Ink is the operational layer built on top of raw financial signals.

Reasons:

- the current integration is already Plaid-based
- Plaid is the primary infrastructure layer for balances and transactions
- Monarch's unofficial API creates fragility and support risk
- Ink needs direct access to raw signals, not another product's opinionated aggregation layer

Monarch remains useful as the user's external finance home. Ink should not attempt to replace it.

---

## V1 Product Definition

V1 is a **daily money brief** with optional supporting detail.

The brief should answer:

1. How much cash is actually available today?
2. What is the next real obligation?
3. What is due in the next 7 days?
4. Is there any mismatch between available cash and near-term obligations?
5. What action, if any, matters today?

If those five questions are answered clearly, v1 succeeds.

---

## Daily Brief Surface

### Default view

The money surface should open into a compact daily brief, not a generalized finance dashboard.

Recommended structure:

**1. Today's Position**

- available cash now
- optional confidence note if freshness is old
- one short read on whether the position is fine, tight, or requires action

Example:

> Available cash today: $2,140  
> Position is fine. Next pressure point is Friday.

**2. Next Up**

- next 1-3 obligations that matter
- amount
- due date
- status: confirmed / inferred / watch
- covered or not covered

Example:

> Amex: $640 due Friday, confirmed, covered  
> Rent: $2,200 likely due in 8 days, inferred, watch

**3. Today's Call**

Exactly one action sentence when relevant.

Examples:

> Hold discretionary spending until Monday.  
> Send the overdue invoice today.  
> Pay Amex today and ignore the rest.

If no action is needed:

> No money action needed today.

**4. Work Tie-In**

Only shown when financial pressure materially affects work priorities.

Examples:

> Cash is thin relative to the next 7 days. Prioritize invoice follow-up and the client deck over lower-value admin.

This is where Ink becomes itself. The brief should connect money pressure to project reality, not just list obligations.

---

## Supporting Detail Surface

The user can choose to open more detail, but this should remain secondary.

Allowed secondary sections in v1:

- balances by account
- 7-day and 14-day obligation view
- coarse spending summary
- expected inflows
- financial action items

Not allowed in v1:

- full transaction feed
- budget editing
- category rule management
- debt payoff calculators
- net worth tracking

---

## Data Model

Ink only needs a small number of financial objects.

### 1. Accounts

Observed via Plaid.

Fields:

- `id`
- `name`
- `type`
- `currentBalance`
- `availableBalance`
- `institution`
- `lastSyncedAt`

Purpose:

- support today's cash position
- support account-level visibility when the user chooses to inspect

### 2. Obligations

This is the center of the product.

An obligation is anything that can create financial pressure in the near term: rent, card payments, subscriptions, tools, taxes, payroll, ad spend, insurance, invoice follow-up, transfer requirements.

Fields:

- `id`
- `name`
- `amount`
- `dueDate`
- `cadence` — one-time / weekly / monthly / quarterly / annual / irregular
- `kind` — personal / business / tax / debt / subscription / transfer / receivable-follow-up
- `status` — pending / paid / skipped / watch
- `certainty` — confirmed / inferred / watchlist
- `source` — manual / plaid-recurring / imported / system-derived
- `covered` — boolean or derived state
- `notes`

Purpose:

- provide the next-up view
- support 7-day pressure calculations
- drive action recommendations

### 3. Expected Inflows

Needed because work and money are linked.

Fields:

- `id`
- `name`
- `amount`
- `expectedDate`
- `confidence` — confirmed / invoiced / verbal / speculative
- `source`
- `linkedProjectId` or equivalent optional pointer

Purpose:

- prevent the app from being purely threat-oriented
- connect work priorities to financial reality

### 4. Spending Summary

This should stay coarse in v1.

Fields:

- `periodStart`
- `periodEnd`
- `bucket`
- `spent`
- `trend` optional

Recommended buckets:

- fixed bills
- discretionary personal
- business
- unknown

Purpose:

- give context when spending is unusually high
- support warnings without becoming a budget tool

### 5. Financial Action Items

Actions generated from obligations or inflows.

Fields:

- `id`
- `title`
- `type` — pay / hold / transfer / invoice / review / follow-up
- `dueDate`
- `reason`
- `status`
- `linkedEntityId`

Purpose:

- make the brief operational
- support the morning briefing and task prioritization

---

## Source-of-Truth Rules

These rules are not implementation detail. They are product integrity.

### Balances

Source of truth: Plaid account balances.

These can be presented as observed facts, with freshness attached.

### Due dates

Source of truth:

- manual entry for confirmed obligations
- imported bill data if a real bill source is added later
- recurring transaction inference only when no confirmed date exists

Recurring transaction streams are not sufficient proof of an exact due date. Inferred dates must be labeled as inferred.

### Upcoming bills

Source of truth: obligations table, not raw recurring streams.

Plaid recurring transactions should populate suggestions or update watchlist items. They should not directly become "bill due today" claims without a translation layer.

### Spending

Source of truth: aggregated transaction summaries from Plaid.

This is context, not command. Spending should support warnings, not dominate the surface.

### Expected income

Source of truth: manual or imported entries, optionally connected to work systems later.

Plaid will not know about a freelance invoice until it lands. Ink must model expected inflows explicitly.

---

## Daily Brief Logic

The brief should be assembled in this order:

### 1. Determine available cash

Start from linked account balances. Apply whatever reserve logic is defined for Ink, but keep the result interpretable.

V1 recommendation:

- use available balances as the base
- optionally subtract a user-defined reserve floor
- display both numbers only if helpful

The brief should avoid opaque calculations. If it says "available cash today," the user should be able to understand where that number came from.

### 2. Determine near-term obligations

Compute obligations due within:

- today
- next 3 days
- next 7 days
- next 14 days

Rank by consequence first, then date.

Consequence signals:

- confirmed and uncovered
- past due
- large relative to available cash
- operationally disruptive if missed

### 3. Determine cash pressure

Compare available cash against confirmed near-term obligations, then against inferred obligations.

Resulting states:

- **Clear** — confirmed obligations are covered comfortably
- **Tight** — confirmed obligations are covered but cushion is thin
- **At risk** — confirmed obligations are not clearly covered
- **Watch** — confirmed obligations are covered, but inferred near-term pressure may create strain

### 4. Determine whether action is needed

Only produce an action if the user can actually do something meaningful today.

Good actions:

- pay this bill
- hold discretionary spending
- move money
- send invoice
- follow up on payment

Bad actions:

- vague anxiety phrased as advice
- "monitor this"
- duplicative reminders with no decision attached

### 5. Determine work relevance

Only attach money pressure to project priorities if:

- cash pressure is tight or at risk, or
- an expected inflow depends on completing or sending something

This is the bridge between finance and work. It should feel precise, not melodramatic.

---

## Notification and Interruption Rules

The daily brief should be the primary money interaction. Interruptions should be rare.

Allowed interruptions:

- bill due today and not covered
- account balance materially lower than expected relative to confirmed obligations
- overdue invoice or payment follow-up with real consequence
- unusual spending that creates immediate risk

Not worth interrupting for:

- ordinary daily transaction movement
- every recurring charge detected
- small category drift
- generic balance changes with no decision attached

The app should behave like a calm operator, not a panic machine.

---

## UX Guidance

### Default behavior

- one daily brief
- concise language
- no endless money feed
- no decorative finance theater

### Tone

The system should speak plainly:

- what exists
- what is due
- what matters
- what to do

It should not sound like a budgeting app, a finance influencer, or a bank.

### Controlled disclosure

The user can open detail intentionally, but the default state should support not-looking.

This is a product requirement, not just a layout preference.

---

## Honest V1

An honest v1 would include:

- Plaid-linked balances
- manually managed obligations
- Plaid recurring streams as obligation suggestions
- 7-day obligation view
- coarse spending summary
- manual expected inflows
- daily action sentence
- optional tie-in to project priorities

An honest v1 would **not** claim:

- precise due dates from recurring streams alone
- full bill awareness from Plaid alone
- complete monthly budgeting coverage
- reliable income forecasting without manual input

---

## Implications for Current Implementation

The current codebase already has the right broad direction: direct Plaid integration, engine-side financial assembly, and a money-specific view.

The main product correction is to make the obligation model primary and Plaid recurrence secondary.

That means:

- balances remain Plaid-driven
- recurring transactions become suggestion input, not final truth
- due dates require explicit confidence labels
- the default surface becomes the daily brief, not a generalized money dashboard
- expected inflows need first-class treatment if work priorities are going to reflect money pressure honestly

---

## Open Questions

These need decisions before implementation hardens:

1. What reserve logic defines "available cash today" in Ink?
2. How should the user confirm or edit inferred obligations?
3. Should business and personal obligations be shown together by default, or grouped?
4. What threshold turns "tight" into a visible warning?
5. Which work systems, if any, should feed expected inflows in a later phase?

---

## Recommendation

Build Ink's financial layer as a daily brief and restraint system.

Use Plaid for observed financial data. Keep Monarch outside the product boundary. Make obligations, inflows, and actions the actual product model. Keep the first surface short, useful, and hard to compulsively over-read.

That is the version of the money feature that belongs inside Ink.
