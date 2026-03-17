# Inked Build Spec — Design Document

**Date**: 2026-03-17
**Status**: Draft
**Source**: inked-build-spec-v2.docx

## Problem

Inked opens to four columns simultaneously — dashboard overload at 8am. The user manually organizes tasks through drag-and-drop. Ink (the AI) is an optional sidebar. The fix: make Ink the primary planning interface. The user shows up, answers questions, confirms the plan, and executes. The dashboard becomes the execution view, not the planning view.

## What Changes

1. **Persistent context** via electron-store — Ink writes and reads context across sessions
2. **Journal memory** — morning answers persist and inform Ink all week (7-day rolling window)
3. **Sunday Weekly Interview** — extracts real priorities, writes weekly context
4. **Morning Briefing rewrite** — Tony Robbins journal beat first, then planning conversation
5. **Opening sequence** — Ink + compact calendar together, everything else slides in after commit
6. **AI as planner** — Ink places tasks on calendar based on conversation, not manual drag
7. **Multi-prompt architecture** — right prompt for the right mode

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistence mechanism | electron-store (not separate file) | Consistent with existing architecture, atomic writes, no sync issues |
| App name | Rename Threadline → Inked | Per user direction |
| Journal model | Separate InkJournalEntry (not extending DayEntry) | Different purpose, different timing (morning ritual vs end-of-day freeform) |
| Token limits | Scale per mode | Interview/Briefing need room (~800); mid-session stays tight (400) |
| Opening calendar | Compact/mini view | Gives bearings without full interactivity; expands after commit |
| Ink is additive | All drag-and-drop stays | Ink is a new planning layer, not a replacement. After commit, full manual control (DnD, reorder, Asana drag, timeline drop, subtask nesting) works exactly as before. |
| Sprint 3 | Split into 3a (journal conversation) + 3b (layout rewrite) | Lower risk per sprint, independently testable |

## Architecture

### Mode System

| Mode | Trigger | Job | Tokens |
|------|---------|-----|--------|
| Sunday Interview | Sun/Mon first open | Extract hierarchy, musts, tells, artist date. Write context. | 800 |
| Morning Briefing | Weekday first open | Journal beat (3 questions), then planning conversation | 800 |
| Mid-Session | Mid-day | Current recovery prompt + context injection | 400 |
| Evening Close | End of day | Compare morning journal to actual day. Clean handoff. | 600 |

### InkContext Schema (electron-store key: `inkContext`)

```typescript
interface InkContext {
  // Sunday Interview output
  weeklyContext?: string;
  hierarchy?: string;
  musts?: string;
  currentPriority?: string;
  protectedBlocks?: string;
  tells?: string;
  artistDate?: string;
  honestAudit?: string;
  weekUpdatedAt?: string;

  // Three Threads snapshot
  threadsRaw?: string;

  // Rolling 7-day journal
  journalEntries: InkJournalEntry[];

  lastUpdated: string;
}

interface InkJournalEntry {
  date: string;              // YYYY-MM-DD
  excites: string;           // "What excites you today?"
  needleMovers: Array<{      // "One thing that moves [Goal] forward"
    goalTitle: string;       // From weekly intentions (Three Threads) — dynamic, not hardcoded
    action: string;
  }>;
  artistDate: string;        // "What's just for you?"
  eveningReflection?: string;
  createdAt: string;
}
```

### Storage Layer (IPC)

Three handlers in `electron/ink-context.ts`:
- `ink:read-context` → returns InkContext
- `ink:write-context` → shallow merge + save
- `ink:append-journal` → upsert by date, trim to 7 days

Renderer access: `window.api.ink.readContext()` / `.writeContext()` / `.appendJournal()`

### Opening Sequence (Sprint 3b)

```
App opens
  → AppLayoutPhase = 'opening'
  → Ink chat panel (left/center) + compact calendar (right)
  → No sidebar, no UnifiedInbox, no TodaysFlow

Ink runs morning journal (3 questions)
  → Answers saved via appendJournalEntry()

Ink pivots to planning conversation
  → Reads context + calendar + tasks
  → Proposes task placement: "Act 2 rewrite in writing block at 9:30. Confirmed?"

User confirms commit
  → AppLayoutPhase = 'active'
  → Full panels slide in (sidebar, UnifiedInbox, TodaysFlow, full Timeline)
  → Plan is already built
```

### Sunday Interview → Context Flow (Sprint 4)

```
Sunday/Monday first open
  → detectInkMode() returns 'sunday-interview'
  → Interview prompt loads, reads last 7 days of journal entries
  → 7 questions, one at a time, with pushback
  → AI outputs JSON context block (fenced code block)
  → Renderer detects JSON, parses, calls writeContext()
  → Context persists for the whole week
```

### Journal Memory (Sprint 6)

Mid-day: "You said this morning you were excited about X. How's that going?"
Evening: "You said Y would move DRIVR forward. Did it?"
Weekly: Reads 7-day journal history before the honest audit question.

## Build Order (7 Sprints)

### Sprint 1: Persistent Storage
- InkContext + InkJournalEntry types
- readContext / writeContext / appendJournalEntry IPC handlers
- InkMode enum + detectInkMode() utility
- Token limit constants
- **No UI, no prompts**

### Sprint 2: Three Threads → Context
- WeeklyGoals save triggers writeContext() with threads data
- readContext() output prepended to every Ink prompt at runtime
- Mode-aware token limits wired into anthropic.ts

### Sprint 3a: Journal Conversation Phase
- New 'journal' phase in MorningBriefing component
- 3 morning questions (excites, needle-mover, artist date)
- Answers call appendJournalEntry()
- Morning Briefing system prompt rewrite (Phase 1: journal, Phase 2: planning)

### Sprint 3b: Opening Layout Rewrite
- Pre-commit layout: Ink + compact calendar only
- Post-commit: all panels slide in
- AppLayoutPhase state machine in App.tsx
- CompactTimeline component (or Timeline compact prop)

### Sprint 4: Sunday Interview Mode
- Sunday/Monday detection in mode logic
- Interview system prompt (7 questions)
- 7-day journal read before Question 1
- JSON output parsing → writeContext()

### Sprint 5: AI as Planner
- Morning briefing proposes specific task placement
- User confirms → scheduleTaskBlock()
- AI can move/replan items by instruction

### Sprint 6: Journal Memory Behaviors
- Mid-day check-in reads morning journal
- Evening close pulls morning journal for comparison
- Weekly interview reads 7-day history
- Unprompted references to morning excitement/artist date

## Risks

1. **JSON parsing from AI output (Sprint 4)**: Claude may not reliably emit parseable JSON. Mitigation: precise system prompt with schema, fenced code block format, graceful fallback with manual "Save reflection" button.

2. **AI as Planner command protocol (Sprint 5)**: Ink needs to emit structured commands for task placement, not just natural language. Requires a command protocol (likely JSON blocks in responses).

3. **MorningBriefing component growth**: Adding journal phase grows the component from ~630 to ~800 lines. If it passes 1000, extract JournalPhase as a sub-component.

4. **Sprint 3b layout is a two-layout-tree conditional render**: Not just adding a state variable — it's rendering two entirely different layout compositions in App.tsx (opening vs active). Biggest UI change in the build.

5. **App rename store path**: Changing the electron-store app name may change the store file path on disk, losing persisted data. Needs explicit `name` option in Store constructor or a migration.

6. **Sunday Interview re-trigger**: `detectInkMode()` needs to check `weekUpdatedAt` (not just day-of-week) to prevent re-triggering on Monday after a Sunday interview.

7. **Sprint 2 cascading IPC changes**: Mode-aware token limits require passing `InkMode` through the full chain: `BriefingContext` → `ai:stream:start` → `buildSystemPrompt` → `max_tokens`. Touches 4+ files.

## Bug Cross-Reference

**Addressed by this build**: Morning planning too busy, calendar/Ink ordering, AI as executive assistant, journal moment, AI memory, workflow enforcement, end-of-day close, LLM personality, weekly objectives connection.

**Not addressed**: NOW flag UX, collapsed sidebar button bug, pomodoro menu bar, drag animation, subtask drop, GCal sync bugs, Asana two-way sync, ESC focus escape, Stage Manager permissions.
