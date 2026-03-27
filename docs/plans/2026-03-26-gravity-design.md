# Gravity — Design

## Problem

Important work gets deferred in favor of dopamine-friendly busywork. Energy tagging and mode locking give the ADHD brain more ways to rationalize avoidance. The real issue is initiation — once you start, hyperfocus takes over. The app needs to make avoidance visible and create friction that nudges you toward what you said matters, then get out of the way.

## Design Principle

Ink doesn't pretend to know better than you. It holds you to what you already said matters. No expertise, no coaching. Just: this is what you said. You haven't done it. Go.

## Core Mechanic

Gravity is a daily visual state that reflects whether you've engaged with your stated intentions.

### Two states

**Gravity on** (default at start of day): The longest-untouched intention is surfaced prominently. The rest of the UI — inbox, task cards not under that intention, right rail — renders dimmed. Not hidden, not locked. Visually receded.

**Gravity released** (after first touch): Once you start a pomodoro timer on any task under the stale intention and it runs for at least 5 minutes, gravity lifts for the rest of the day. Everything returns to full brightness.

### Activation rules

- Gravity scans all intentions, not just #1. Whichever intention has gone longest without a timer start gets surfaced. One at a time.
- "Untouched" means no timer started on any task under that intention. The metric is engagement, not completion.
- Staleness threshold: no timer start in 2-3 days (tunable, start at 2).
- Intention satisfied: 40% of tasks under the intention have been touched or completed. At that point, gravity considers that intention healthy and moves on.
- If all intentions are on track, gravity doesn't activate. Normal day. The app stays out of the way.
- Intentions are mandatory — the weekly briefing gates this. Gravity always has something to work with.

### What gravity doesn't do

- No new inputs from the user. Hangs entirely off existing intentions.
- No energy tagging, mode locking, or task categorization.
- No gamification, streaks, or rewards.
- No task breakdown or workflow suggestions.

## The Morning Moment

Where gravity has its strongest expression: the Plot view / morning briefing.

### Ink's voice

Plain, blunt, factual. No coaching, no guilt language.

Examples:
- "It's been 3 days since you touched your chapter draft. Everything else is on hold until you do."
- "Ship feature spec. You haven't touched it this week. All projects are on hold until you touch it today."
- First day after setting intentions: "Your top intention is [X]. When are you starting?"

### The timer prompt

A single action next to the gravity prompt: start the pomodoro timer on the oldest uncommitted task under the stale intention. Full pomodoro — no special 5-minute mode. The 5-minute reframe is psychological (in the briefing copy), not a feature. If they stop at 5 minutes, that's their call. Inked doesn't build in the escape.

Gravity releases silently after 5 minutes of the timer. No fanfare, no "you're unlocked" moment. The dim fades and the day opens up.

## The Dim — Visual Implementation

### What gets dimmed
- Inbox column (Asana tasks, local tasks, rituals)
- Task cards in Flow view that aren't under the stale intention
- Right rail content (Ledger, deadlines, focus capacity)

### What stays full brightness
- The gravity prompt (briefing or top of Flow view)
- Task cards under the stale intention
- Sidebar navigation
- Timeline/calendar (hard events are real commitments)

### How it looks
- Dimmed elements: `opacity-50` + subtle CSS desaturation filter
- Not blurred, not hidden. Readable, clickable. Just doesn't sparkle.
- Release transition: smooth fade to full brightness over ~500ms. Quiet.
- No overlay, modal, banner, blocking interaction, unlock animation, or sound.
- First-time activation: a brief one-time tooltip explaining what's happening.

The dim is the message.

## Escape Hatch — Anarchy Mode

Accessible via Cmd+K command palette. "Anarchy" releases gravity for the day without starting a timer.

- Quick, intentional, slightly irreverent.
- No modal confirmation. Just a command palette action.
- Ink remembers. Next morning: "Day 4. Yesterday was anarchy."
- No judgment, just the record.

## Edge Cases

**Multiple stale intentions:** Surface the one with the longest gap since last timer start. One at a time.

**Weekends / days off:** User setting. Respects existing workday configuration. If weekends are off, gravity doesn't activate on those days.

**No intentions set:** Gravity doesn't activate. No contract = nothing to hold you to. (Weekly briefing already requires setting intentions before proceeding.)

**User completes or touches 40% of tasks under an intention:** That intention is considered satisfied. Gravity moves to the next stale one, or deactivates entirely.

## What This Builds On

Existing Inked infrastructure — no new data models needed beyond a timer-start timestamp per intention:

- `PlannedTask.weeklyGoalId` — links tasks to intentions
- `PlannedTask.lastCommittedDate` — tracks engagement dates
- `WorkMode` type — already exists but not used by gravity
- `priorityRule` setting — "energy" option already in settings, gravity supersedes it
- Weekly briefing flow — already gates intention-setting
- Pomodoro timer — already exists, gravity just triggers it
- Cmd+K command palette — already exists for quick actions

## What This Is Not

- Not an energy management system
- Not a mode switcher
- Not a task breakdown tool
- Not a productivity coach
- Not a punishment. It's intention, not force.
