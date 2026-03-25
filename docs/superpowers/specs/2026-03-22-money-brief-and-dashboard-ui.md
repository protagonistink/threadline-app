# Money Brief and Dashboard UI

**Date:** 2026-03-22
**Status:** Draft
**Scope:** UI separation between the daily money brief and the deeper money dashboard

---

## The distinction

Yes. Ink should take over giving you the information, at least for the first read of the day.

That is the point of the brief.

If the product works, you should not need to open Monarch to know whether you are okay, what is coming up, and what action matters. Monarch remains the archive, the ledger, the warehouse. Ink becomes the first interpreter.

The mistake would be collapsing "brief" and "dashboard" into the same thing.

They are different surfaces with different jobs:

- the **brief** answers the day
- the **dashboard** supports inspection

The brief is designed to reduce checking. The dashboard is designed to support intentional review without becoming the default experience.

---

## 1. Daily Brief

### Job

Give one clean, low-friction financial read for today.

The brief should feel like a calm note from someone who already looked, not a pile of raw data asking you to interpret it.

### When it appears

- inside the morning briefing
- in the Money view as the default top state
- optionally as a compact card in a sidebar or "today" surface later

### Information hierarchy

The brief should answer in this order:

1. Are you okay?
2. What is the next pressure point?
3. What, if anything, do you need to do today?
4. Does this change what work matters today?

### Layout sketch

```text
+--------------------------------------------------------------+
| MONEY TODAY                                                  |
| Updated 1h ago                                               |
|                                                              |
| $2,140                                                       |
| Available today                                              |
|                                                              |
| Position is fine. Next pressure point is Friday.             |
|                                                              |
| NEXT UP                                                      |
| Amex ............ $640 ........ Fri ........ Covered         |
| Rent ............ $2,200 ...... In 8 days ... Watch         |
| Adobe ........... $62 ......... Mon ........ Covered         |
|                                                              |
| TODAY'S CALL                                                 |
| No money action needed today.                                |
|                                                              |
| WORK TIE-IN                                                  |
| Cash is fine. Do not let money anxiety hijack the day.       |
|                                                              |
| [See detail]                                                 |
+--------------------------------------------------------------+
```

### Key behaviors

#### A. One number, not six

Lead with one number only: `Available today`.

If more numbers appear immediately, the product loses discipline and the user starts scanning instead of reading.

Secondary numbers belong below the fold or in detail:

- current balances by account
- total due in 7 days
- total due in 14 days
- reserve floor

#### B. Three obligations maximum in the first read

Do not show a long list by default. Show the obligations that matter most right now.

Sorting:

- uncovered confirmed items first
- then confirmed items by due date
- then inferred watch items

#### C. One action sentence

The brief should make one call, not five.

Examples:

- No money action needed today.
- Pay Amex today.
- Hold spending until Tuesday.
- Send the overdue invoice before 2 p.m.

#### D. Work tie-in is conditional

If money does not alter the day, the product should not invent a dramatic connection.

When it does matter, it should be blunt:

- You need cash in the next 7 days. Prioritize invoice follow-up.
- Ad spend renews Friday. Review campaign performance before noon.

#### E. Detail is available but not ambient

The brief should end with one intentional move:

- `See detail`

Not:

- tabs
- many widgets
- lots of exposed controls

The user should feel the system has already filtered the field.

---

## 2. Dashboard

### Job

Support deliberate inspection when the brief is not enough.

This is where the user goes to answer:

- Which account is actually carrying the cash?
- What is due over the next 14 days?
- Which obligations are inferred versus confirmed?
- What spending moved recently?
- Which inflows are expected and how reliable are they?

The dashboard is not a control room. It is a secondary surface for context.

### Layout sketch

```text
+--------------------------------------------------------------+
| MONEY                                                        |
| Brief | Detail                                               |
+--------------------------------------------------------------+
| TODAY                                                        |
| Available today: $2,140                                      |
| Confirmed due in 7d: $702                                    |
| Watchlist due in 14d: $2,200                                |
| Status: Fine                                                 |
+--------------------------------------------------------------+
| ACCOUNTS                                                     |
| Checking .................. $1,420 available                 |
| Savings ................... $3,800 current                   |
| Amex ...................... -$640 current                    |
+--------------------------------------------------------------+
| UPCOMING                                                     |
| Fri   Amex                  $640   Confirmed   Covered       |
| Mon   Adobe                 $62    Confirmed   Covered       |
| In 8d Rent                  $2,200 Inferred    Watch         |
| In 11d Payroll transfer     $900   Confirmed   Not covered   |
+--------------------------------------------------------------+
| EXPECTED INFLOWS                                              |
| Client A invoice           $2,400  Invoiced    5 days late   |
| Deposit from B             $850    Confirmed   Thu           |
+--------------------------------------------------------------+
| SPENDING SNAPSHOT                                              |
| Fixed bills ............... $1,280                           |
| Discretionary ............. $340                             |
| Business .................. $410                             |
| Unknown ................... $56                              |
+--------------------------------------------------------------+
| ACTIONS                                                       |
| Send Client A follow-up                                        |
| Review payroll transfer                                        |
| Hold discretionary spend until invoice lands                   |
+--------------------------------------------------------------+
```

### Dashboard sections

#### A. Today strip

A compact top strip with the key derived numbers. This is a recap, not a replacement for the brief.

Recommended fields:

- available today
- confirmed due in 7 days
- watchlist due in 14 days
- status: fine / tight / at risk / watch

#### B. Accounts

Straight list. No charts necessary in v1.

Show:

- account name
- available or current balance depending on account type
- institution if needed

No:

- spark lines
- category breakdowns inside each account
- transaction-level activity

#### C. Upcoming

This is the core panel in detail view.

Requirements:

- supports 7-day and 14-day reading
- clearly marks `confirmed`, `inferred`, `watch`
- clearly marks `covered` versus `not covered`
- sorts by consequence, not just chronology

#### D. Expected inflows

This section matters because your work and cash flow are linked.

Show:

- source
- amount
- expected date
- confidence
- lateness if overdue

This is where the app starts to translate money pressure into actual work pressure.

#### E. Spending snapshot

Keep this blunt and aggregated.

It exists to answer:

- did something spike?
- is there a category of pressure?

It does not exist to become a budget manager.

#### F. Actions

A clear list of the money moves that matter.

These should be finite and consequential, not a dumping ground for every financial event.

---

## Interaction model

### Default entry

The Money view should land on `Brief` by default.

The dashboard should sit one click away as `Detail`.

That can be tabs, a segmented control, or a "See detail" drill-in. The important thing is the order of exposure:

- brief first
- detail second

### Morning briefing integration

The morning briefing should pull from the brief surface, not the dashboard.

Good:

> Available today is $2,140. Amex is due Friday and covered. No money action needed today.

Also good:

> Cash is tight relative to the next week. Send the overdue invoice today before admin work.

Bad:

> Here are all account balances, subscriptions, recent merchants, and category totals.

### Refresh behavior

Refresh should be explicit.

Do not create a casino pull-to-refresh feeling around money.

Suggested behavior:

- show freshness quietly
- allow manual refresh
- auto-refresh on app open or once daily if needed

Not:

- constant refreshing
- flashing updates
- aggressive polling in the visible UI

---

## Why this split matters

If Ink only gives the dashboard, you will keep interpreting the data yourself and likely over-check.

If Ink only gives the brief, you may not trust it enough yet.

So the product should do both, but with a clear hierarchy:

- the brief earns trust by being concise and right
- the dashboard exists to let you verify and inspect on purpose

That is how Ink "takes over giving you the information" without becoming opaque or paternalistic. It becomes the first narrator, not the only source.

---

## Design guidance

### Brief tone

Quiet, decisive, minimally emotional.

It should feel like:

- "here is the state"
- "here is the pressure point"
- "here is the move"

Not:

- gamified
- market-y
- soothing in a fake way
- alarmist

### Dashboard tone

Still calm, but denser and more literal.

The dashboard earns trust by showing the underlying pieces without making the user swim through raw ledger noise.

### Visual contrast

The brief should feel singular and composed.

The dashboard should feel more grid-based, inspectable, and matter-of-fact.

That difference should be visible in the layout itself, not just the labels.

---

## Recommendation

Yes: Ink should take over giving you the first read.

That means designing two separate money surfaces:

- a daily brief that interprets the day for you
- a dashboard that supports inspection when you consciously want more

If the hierarchy is right, you stop opening Monarch reflexively because Ink already answered the question you were going there to answer.
