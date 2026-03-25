# Money Screen States

**Date:** 2026-03-23
**Status:** Draft
**Scope:** Exact screen states, field order, tone, and example copy for Ink's financial surfaces

---

## Purpose

This spec defines the actual screen behavior for Ink's money experience so the product remains one app, one voice, one rhythm.

The goal is not to design a finance feature in isolation. The goal is to make money feel native to Ink's existing operating logic:

- the app reads the situation first
- the user gets the useful part
- detail exists, but only when chosen

Money should feel like consequence, not administration.

---

## Product structure

There are five core screen states:

1. Morning briefing money block
2. Money brief — calm
3. Money brief — warning
4. Money brief — compressed
5. Money detail view
6. Money unconnected / concept-source empty state

Each state has a distinct job. They should not collapse into one another.

---

## 1. Morning Briefing Money Block

### Job

Give the financial read for the day inside the morning briefing.

This is the first and most important surface. If it works, the user does not need to open Monarch reflexively just to know whether anything is wrong.

### Placement

Inside the morning briefing flow, after the schedule/pressure read and before or alongside the day's recommended commitments.

It should read like one short paragraph or one compact card, not a mini-dashboard.

### Field order

1. available today
2. next pressure point
3. today's call
4. optional work tie-in

### Format

Recommended structure:

**Heading:** `Money`

**Body:** 2-4 short sentences max

### Calm example

> Available today is $2,140. Amex is due Friday and covered. No money action needed today.

### Warning example

> Available today is $480. Insurance is due in 3 days and this week is tight. Hold discretionary spending until the deposit lands.

### Compressed example

> Cash is tight against the next 7 days. Send the overdue invoice before admin work. Treat everything else as secondary until that moves.

### Rules

- no account list
- no category breakdown
- no more than one action sentence
- no dramatic framing when nothing is wrong
- if work is unaffected, do not force a work tie-in

---

## 2. Money Brief — Calm

### Job

Let the user open Money and feel finished quickly.

This state should confirm stability and reduce the impulse to keep digging.

### Emotional tone

Quiet, clean, lightly reassuring without sounding therapeutic.

### Layout order

1. header
2. available today
3. position line
4. next up
5. today's call
6. no work tie-in unless genuinely relevant
7. path to detail

### Content structure

**Header**

- `Money`
- freshness line, quiet
- toggle or link to detail

**Primary figure**

- large number
- label: `Available today`

**Position line**

Example:

> Position is fine. Next pressure point is Friday.

**Next Up**

Maximum 3 items.

Example:

- `Amex` — `$640` — `Fri` — `Covered`
- `Adobe` — `$62` — `Mon` — `Covered`
- `Rent` — `$2,200` — `In 8 days` — `Watch`

**Today's Call**

Example:

> No money action needed today.

### Calm rules

- no red
- no long stack of obligations
- no recommendations list
- no dense account panel
- no pressure language unless there is actual pressure

This state should feel like permission to move on.

---

## 3. Money Brief — Warning

### Job

Signal that attention is needed soon, but without turning the interface into a threat machine.

### Emotional tone

Focused, unsentimental, mildly stern.

### Layout order

Same structure as calm, but with stronger emphasis on:

1. position line
2. next up
3. today's call
4. optional work tie-in

### Content structure

**Primary figure**

- same large number
- label stays `Available today`

Do not swap the main number to "money missing" or "danger." Keep the number stable and let the interpretation carry the pressure.

**Position line**

Example:

> Position is watchful. Insurance is the next pressure point.

**Next Up**

Still max 3 items, but the sort order changes:

- uncovered confirmed items
- confirmed due soon
- inferred watch items

**Today's Call**

Examples:

> Hold discretionary spending until Tuesday.

> Move $300 before Friday.

> Send the invoice follow-up this morning.

**Work Tie-In**

Example:

> Cash is tighter than usual this week. Protect the work most likely to move revenue.

### Warning rules

- keep the surface compact
- never show more than one primary instruction
- use color sparingly
- let the prose do the pressure work

---

## 4. Money Brief — Compressed

### Job

Make the urgent truth hard to miss and easy to act on.

This is the state where the app is allowed to be blunt.

### Emotional tone

Direct, controlled, non-panicked.

### Layout order

1. available today
2. hard position line
3. next up
4. today's call
5. work tie-in
6. optional "see detail"

### Content structure

**Position line**

Examples:

> Cash is tight. Amex is the next pressure point.

> The next 7 days do not clear cleanly.

> Today requires a money move.

**Next Up**

Show only the items that matter now.

Better to show 2 sharp obligations than 6 complete ones.

**Today's Call**

Examples:

> Send the overdue invoice before noon.

> Pay Amex today and hold the rest.

> Move cash now. Do not spend freely today.

**Work Tie-In**

Examples:

> Revenue work outranks cleanup today.

> This is not an admin day. Protect the task most likely to move cash.

### Compressed rules

- no soothing language
- no extra sections competing with the core call
- no recommendation carousel or stack
- do not over-explain the math

This state should feel like operational clarity under pressure.

---

## 5. Money Detail View

### Job

Support verification and inspection after the brief.

This is not the main character. It exists because trust requires a place to look behind the summary.

### Emotional tone

Literal, composed, useful.

### Layout order

1. today strip
2. accounts
3. upcoming
4. expected inflows
5. spending snapshot
6. actions

### Section details

#### Today strip

Fields:

- available today
- confirmed due in 7 days
- watchlist due in 14 days
- state: fine / watch / tight / at risk

Purpose:

- recap the summary in denser form

#### Accounts

Fields:

- account name
- institution optional
- available or current balance

Rules:

- no charting required in v1
- no transaction preview

#### Upcoming

Fields:

- name
- amount
- due date or relative date
- certainty: confirmed / inferred / watch
- coverage: covered / watch / not covered

Rules:

- sort by consequence before chronology
- business and personal can coexist, but use tags if needed

#### Expected inflows

Fields:

- source / client / item
- amount
- expected date
- confidence
- overdue indicator if relevant

Purpose:

- connect work to money honestly

#### Spending snapshot

Fields:

- fixed bills
- discretionary
- business
- unknown

Rules:

- aggregate only
- no budget controls
- no dense category table in v1

#### Actions

Fields:

- title
- amount if relevant
- due date if relevant
- status

Rules:

- finite list only
- avoid duplicating obligations mechanically
- only show actions with real consequence

---

## 6. Money Unconnected / Concept-Source Empty State

### Job

Explain what the feature does and what the next setup step is, without implying failure.

### Emotional tone

Inviting, matter-of-fact.

### Plaid version

**Heading:** `Connect your bank`

**Body:**

> Ink can give you a daily money read instead of forcing you to keep checking. Connect a source to see what is available, what is due next, and what actually matters today.

**Action:** `Connect Bank Account`

### Monarch concept version

**Heading:** `Add your Monarch token`

**Body:**

> For concept-stage testing, Ink can pull balances and transaction history from Monarch. This is enough to shape the daily brief without waiting on Plaid approval.

**Action:** no primary inline connect flow required if token entry lives in Settings

Optional link:

> `Open Settings`

### Empty-data state after connection

If the provider is configured but no usable data has landed yet:

**Body:**

> The source is connected, but Ink does not have enough signal yet to build a useful brief. Refresh once, then check that balances and recent transactions are available.

Action:

> `Refresh`

---

## Interaction rules across all states

### 1. The brief is the first read

The app should always enter through summary before detail.

### 2. One action at a time

Do not stack five recommendations and call that clarity.

### 3. Prose before panels

Interpretation should lead. Raw structure supports it.

### 4. Stable vocabulary

Use the same terms consistently:

- `Available today`
- `Next Up`
- `Today's Call`
- `Work Tie-In`
- `Detail`

Do not keep renaming the same concept.

### 5. Pressure should come from content, not decoration

Use color and density lightly. The words should do most of the work.

---

## Copy system

### Good phrases

- Position is fine.
- Position is watchful.
- Cash is tight.
- Next pressure point is Friday.
- No money action needed today.
- Hold discretionary spending until Tuesday.
- Send the invoice follow-up this morning.
- Revenue work outranks cleanup today.

### Avoid

- You're crushing it
- Don't panic
- You're safe
- Smart spending insights
- Healthy budget trends
- Money wellness
- Financial control center

These belong to other products.

---

## Design intent

The brief should feel like a page from the same book as the rest of Ink.

That means:

- same restraint
- same interpretive stance
- same bias toward consequence and action
- same refusal to show more just because more exists

The detail view should earn trust by being available, but the brief should remain the product's center of gravity.

---

## Recommendation

Build the morning block and the brief states first. Make them sharp enough that opening the detail view feels optional most days.

If the user still feels compelled to verify constantly, the brief has not earned trust yet.
