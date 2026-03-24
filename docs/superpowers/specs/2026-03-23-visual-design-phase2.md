# Inked Visual Design — Phase 2

**Date:** 2026-03-23
**Depends on:** Phase 1 Foundation Restructure (complete, merged)
**References:** Superhuman, Raycast, Reclaim.ai

---

## Design System

### Typography

**Font:** Satoshi (Indian Type Foundry, free via Fontshare)
- Weights: 400 (body), 500 (labels, medium emphasis), 700 (headings, time display)
- Replaces: Cormorant italic (killed), system SF Pro (replaced for brand identity)
- Load via: `@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap')`
- Fallback: `-apple-system, BlinkMacSystemFont, sans-serif`

**Hierarchy:**
- Page titles: 24-28px, weight 700, letter-spacing -0.02em
- Section labels: 10-11px, weight 500, uppercase, letter-spacing 0.08-0.1em
- Body: 13-14px, weight 400, line-height 1.5-1.6
- Metadata/secondary: 11px, weight 400
- Timer display: 38-46px, weight 700, letter-spacing -0.03em

### Color System — Dark Mode

**Base surface:** Warm Slate `#1c1b22` (purple-charcoal)
- Elevated surface: `#252430` (cards, modals)
- Gradient: `linear-gradient(155deg, #1c1b22 0%, #252430 30%, #1e1d26 70%, #1c1b22 100%)`

**Text:** Cream-white, not pure white
- Primary: `rgba(255,248,235,0.92)` — headings, task titles
- Secondary: `rgba(255,240,220,0.48)` — body text, descriptions
- Muted: `rgba(255,240,220,0.25-0.35)` — metadata, labels, hints
- Whisper: `rgba(255,240,220,0.12-0.18)` — ESC hints, disabled

**Borders:** `rgba(255,240,220,0.04-0.06)` — visible structure without harsh lines

**Surfaces:** `rgba(255,240,220,0.02-0.03)` — card backgrounds, hover states

### Color System — Light Mode

**Base surface:** Warm Paper `#FAFAFA` (anchored to Protagonist Ink brand)
- Elevated surface: `#F5F2EE` (cards, modals)
- Gradient: `linear-gradient(155deg, #FAF8F5 0%, #F5F2EE 50%, #FAF8F5 100%)`

**Text:** Warm brown, not pure black
- Primary: `rgba(40,30,20,0.9)` — headings
- Secondary: `rgba(60,50,40,0.5)` — body
- Muted: `rgba(60,50,40,0.35-0.4)` — metadata

**Borders:** `rgba(60,50,40,0.06-0.08)`

### Accent Colors

**Primary accent:** Protagonist Rust `#C83C2F`
- Used for: active states, NOW indicators, primary actions, focus ring, ink bleed
- At rest state for interactive elements

**Active accent:** Coral `#f47252`
- Used for: hover, pressed, active interaction states
- The rust "lights up" to coral when you touch it

**Intention colors (3-color palette):**
- Purple: `rgba(167,139,250)` / light mode: `rgba(91,60,196)` — e.g., DRIVR
- Teal: `rgba(45,212,191)` / light mode: `rgba(12,140,115)` — e.g., Upwork
- Amber: `rgba(251,191,36)` / light mode: `rgba(170,115,0)` — e.g., Content

**Intention usage:**
- Timeline block stripe + gradient fill
- Intention pills in briefing/rail
- Color dots next to intention names
- Focus mode intention badge

---

## Component Designs

### Timeline Blocks — Left Stripe + Gradient Fade

**Task blocks:**
- 3px left border in intention color
- `background: linear-gradient(90deg, rgba(intentionColor, 0.06-0.08) 0%, rgba(surface, 0.02) 40%)`
- Border: `1px solid rgba(255,240,220,0.04)`
- Border-radius: `2px 8px 8px 2px` (sharp on stripe side)
- Title: `rgba(255,248,235,0.88)`, 13px, weight 500
- Metadata: `rgba(255,240,220,0.3)`, 11px

**Active block (NOW):**
- Same stripe+gradient as above
- Additional: `box-shadow: 0 0 0 1px rgba(200,60,47,0.3), 0 2px 10px rgba(200,60,47,0.05)`
- NOW badge: rust text on rust/10% background, 9px weight 700

**Calendar events (hard blocks):**
- Neutral surface: `rgba(255,240,220,0.02)`
- Border: `rgba(255,240,220,0.05)`
- No intention color — these are external, not yours
- Muted text

**Ritual blocks:**
- Dashed border: `1px dashed rgba(255,240,220,0.06-0.08)`
- Dashed left stripe: `3px dashed rgba(255,240,220,0.1)`
- Lower opacity text: `rgba(255,240,220,0.35)`
- Signals: soft, moveable, not locked

**Current time indicator:**
- Horizontal line: `rgba(200,60,47,0.6)`, 2px
- Leading dot: 8px circle, `rgba(200,60,47,0.9)`

### Right Rail — Clean Sections

**Layout:** ~240px width, `border-left: 1px solid rgba(255,240,220,0.04)`, scrollable
- No cards or boxes — content separated by thin dividers (`rgba(255,240,220,0.04)`)
- Section headers: uppercase, muted, 10px weight 500

**Sections top to bottom:**
1. Focus Capacity — italic, Ink's voice ("About 4 hours of deep work today.")
2. Intentions — color dots + titles with short context
3. Balance Awareness — italic muted observation, Ink's voice
4. Money Moves — label + amount pairs, rust for due-soon amounts
5. Deadlines — title + relative date, rust for urgent
6. Ink Link — sparkle icon + "Talk to Ink"
7. End of Day Nudge — appears at workday end, replacing or below capacity

### Focus Mode — Ring + Ink Bleed

**Layout:** Full screen, centered content, dark slate background

**Elements top to bottom:**
- Task title: 28px weight 700
- Intention badge: color dot + name, 12px
- Ring timer: 160px diameter, 3px stroke in rust, time centered inside (38px weight 700)
- Icon controls: circle buttons — pause (‖), reset (↺), done (✓ in rust/larger)
- ESC hint: whisper text at bottom

**Ink bleed animation:**
- Background fills with `rgba(200,60,47,0.07)` from left to right, feathered edge
- Synced with ring progress — both at same percentage
- Last 5 minutes: ring shifts toward coral, bleed intensifies slightly
- Complete: ring closes, bleed covers full screen, brief pulse
- Paused: ring and bleed freeze, ring dims

**Controls:**
- Pause: 36px circle, muted stroke icon
- Reset: 36px circle, muted stroke icon
- Done (✓): 44px circle, rust background/border, rust checkmark — larger than others

### Sidebar — Glassmorphic Overlay

Phase 1 built the collapsed icon strip + hover overlay structure. Phase 2 adds:
- `backdrop-filter: blur(16px)` on the expanded panel
- `background: rgba(28,27,34,0.85)` (warm slate at 85% opacity)
- `border-right: 1px solid rgba(255,240,220,0.06)`
- Subtle shadow: `box-shadow: 4px 0 24px rgba(0,0,0,0.2)`
- Smooth width transition: `transition: width 200ms ease-out`

### Ink Welcome Screen (Morning Opening)

- Top third: soft gradient or subtle warm wash
- "Good morning, [name]" in 24px weight 700
- Brief context line from Ink in secondary text
- Transition into the conversation naturally
- Evening variant: cooler tone, "Ready to close out?"

---

## Interaction Polish

### Text Selectability
- Timeline block titles: `user-select: none` (prevents accidental selection during drag)
- All non-interactive labels: `user-select: none`
- Input fields and editable text: selectable

### Drag-Drop
- Ghost opacity: 0.3, no rotation or scale
- Drop target: subtle intention-colored highlight
- Dynamic time display when dragging on timeline: show `:30`, `1hr`, `1:30`, `2hrs` as you resize

### Mode Transitions
- Briefing → Planning: content slides/fades, ~300ms ease-out
- Planning → Executing: inbox collapses with width animation (~400ms)
- Executing → Focus: content fades out, focus view fades in (~250ms)
- Focus → Executing: reverse of above

### Tooltips
- Add where icon-only buttons exist (pause, reset, done, sidebar icons)
- Style: small, dark, appears after 500ms hover delay

---

## Implementation Notes

### Satoshi Font Loading
- Install via npm: `@fontsource/satoshi` or load from Fontshare CDN
- Add to `index.html` or Tailwind config as primary font
- Update `tailwind.config` font family: `fontFamily: { sans: ['Satoshi', '-apple-system', ...] }`

### CSS Variable Mapping
Update existing CSS custom properties to new values:
- `--bg`: `#1c1b22` (dark) / `#FAFAFA` (light)
- `--bg-elevated`: `#252430` / `#F5F2EE`
- `--text-primary`: cream / warm brown
- `--text-muted`: cream at 25-35% / brown at 35-40%
- `--accent-warm`: `#C83C2F`
- `--accent-warm-hover`: `#f47252`
- `--border`: cream at 4-6% / brown at 6-8%

### Files to Modify
- `tailwind.config.ts` — font family, color tokens
- `src/index.css` or global styles — CSS variables, font import
- `src/components/timeline/BlockCard.tsx` — stripe+gradient style
- `src/components/timeline/Timeline.tsx` — current time indicator
- `src/components/focus/FocusView.tsx` — ring + ink bleed
- `src/components/rail/RightRail.tsx` + sub-components — clean section styling
- `src/components/chrome/Sidebar.tsx` — glassmorphic layer
- `src/components/chrome/Settings.tsx` — theme toggle values
- `src/modes/BriefingMode.tsx` — welcome screen
- `src/components/PomodoroTimer.tsx` — ring + icon controls
- Every component — font-family references, color token updates

---

## Out of Scope

- 3-day timeline view (separate spec, builds on this)
- Flexible rituals (separate spec)
- Onboarding flow
- Desktop widget
- Ink logo redesign
- Menu bar icon
