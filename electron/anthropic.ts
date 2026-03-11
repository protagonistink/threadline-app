import { ipcMain, IpcMainInvokeEvent } from 'electron';
import Store from 'electron-store';

const store = new Store();

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GCalEventContext {
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
}

interface BriefingContext {
  date: string;
  weeklyGoals: Array<{ title: string; why?: string }>;
  asanaTasks: Array<{
    title: string;
    dueOn: string | null;
    priority?: string;
    project?: string;
    notes?: string;
    tags?: string[];
    daysSinceAdded?: number;
  }>;
  gcalEvents: GCalEventContext[];
  availableFocusMinutes: number;
  scheduledMinutes: number;
  committedTasks: Array<{ title: string; estimateMins: number; weeklyGoal: string }>;
  countdowns: Array<{ title: string; daysUntil: number }>;
  workdayEndHour: number;
  workdayEndMin: number;
}

export function buildSystemPrompt(ctx: BriefingContext): string {
  const goalsList = ctx.weeklyGoals
    .map(g => `- ${g.title}${g.why ? ` (why: ${g.why})` : ''}`)
    .join('\n');

  const asanaList = ctx.asanaTasks.length > 0
    ? ctx.asanaTasks.map(t => {
        const due = t.dueOn
          ? new Date(t.dueOn).toDateString() === new Date().toDateString()
            ? 'DUE TODAY'
            : `due ${t.dueOn}`
          : 'no due date';
        const priority = t.priority ? ` [${t.priority}]` : '';
        const project = t.project ? ` — ${t.project}` : '';
        const age = t.daysSinceAdded != null && t.daysSinceAdded > 7
          ? ` (${t.daysSinceAdded} days old)`
          : '';
        const tags = t.tags?.length ? ` #${t.tags.join(' #')}` : '';
        const notes = t.notes?.trim()
          ? `\n  → ${t.notes.slice(0, 100)}${t.notes.length > 100 ? '…' : ''}`
          : '';
        return `- ${t.title}${priority}${project}${tags} (${due})${age}${notes}`;
      }).join('\n')
    : 'No Asana tasks found.';

  const gcalList = ctx.gcalEvents.length > 0
    ? ctx.gcalEvents.map(e => {
        if (e.isAllDay) return `- All day: ${e.title}`;
        return `- ${e.startTime}–${e.endTime}: ${e.title}`;
      }).join('\n')
    : 'No calendar events today.';

  const countdownsList = ctx.countdowns.length > 0
    ? ctx.countdowns.map(c => `- ${c.title}: ${c.daysUntil} day${c.daysUntil === 1 ? '' : 's'} out`).join('\n')
    : 'No active countdowns.';

  const alreadyCommitted = ctx.committedTasks.length > 0
    ? ctx.committedTasks.map(t => `- ${t.title} (${t.estimateMins}m, ${t.weeklyGoal})`).join('\n')
    : 'Nothing committed yet.';

  const today = new Date();

  const capacityHours = (ctx.availableFocusMinutes / 60).toFixed(1);
  const scheduledHours = (ctx.scheduledMinutes / 60).toFixed(1);
  const remainingHours = (Math.max(0, ctx.availableFocusMinutes - ctx.scheduledMinutes) / 60).toFixed(1);
  const endTime = `${ctx.workdayEndHour}:${String(ctx.workdayEndMin).padStart(2, '0')}`;

  // Rebuild Asana list with urgency markers for the prompt
  const asanaListDetailed = ctx.asanaTasks.length > 0
    ? ctx.asanaTasks.map(t => {
        const dueDate = t.dueOn ? new Date(t.dueOn) : null;
        const dueToday = dueDate && dueDate.toDateString() === today.toDateString();
        const overdue = dueDate && dueDate < today && !dueToday;
        const dueLabel = dueToday
          ? '⚑ DUE TODAY'
          : overdue
          ? `⚑ OVERDUE (was ${t.dueOn})`
          : t.dueOn
          ? `due ${t.dueOn}`
          : 'no due date';
        const priority = t.priority ? ` [${t.priority}]` : '';
        const project = t.project ? ` — ${t.project}` : '';
        const stale = t.daysSinceAdded != null && t.daysSinceAdded > 7
          ? ` (in list ${t.daysSinceAdded}d — stale?)`
          : '';
        const tags = t.tags?.length ? ` #${t.tags.join(' #')}` : '';
        const notes = t.notes?.trim()
          ? `\n  → ${t.notes.slice(0, 100)}${t.notes.length > 100 ? '…' : ''}`
          : '';
        return `- ${t.title}${priority}${project}${tags} | ${dueLabel}${stale}${notes}`;
      }).join('\n')
    : 'No Asana tasks found.';

  // Countdowns with urgency
  const countdownsDetailed = ctx.countdowns.length > 0
    ? ctx.countdowns
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .map(c => {
          const urgency = c.daysUntil <= 2 ? '🔴' : c.daysUntil <= 5 ? '🟡' : '⚪';
          const label = c.daysUntil === 0 ? 'TODAY' : c.daysUntil === 1 ? 'tomorrow' : `${c.daysUntil} days`;
          return `${urgency} ${c.title}: ${label}`;
        })
        .join('\n')
    : 'No active countdowns.';

  return `You are the morning planning voice inside TimeFocus — a focus and planning app built for Patrick Kirkland, a narrative strategist, screenwriter, and founder of Protagonist Ink.

Today is ${ctx.date}. Workday ends at ${endTime}.

---

## LIVE CONTEXT

### Patrick's Weekly Goals
${goalsList}

### Asana Task List
${asanaListDetailed}

### Today's Calendar
${gcalList}

### Deadlines and Countdowns
${countdownsDetailed}

### Already Committed Today
${alreadyCommitted}

### Focus Capacity
- Total available focus: ${capacityHours}h
- Already scheduled in blocks: ${scheduledHours}h
- Remaining open capacity: ${remainingHours}h

---

## YOUR JOB

Run a morning briefing. This is a conversation, not a report. Patrick uses this to figure out what's actually real today — not just what Asana says.

When the briefing opens, give him a sharp read across five things in this order:

1. **What's on fire** — anything due today, overdue, or with a countdown under 3 days. Name it directly. If a hard calendar block is eating his afternoon, factor that into the real focus window.

2. **What's been lying** — any task marked "(in list Xd — stale?)" sitting more than 7 days without moving. Name it and ask if it's real or if it should die.

3. **Goal balance** — which of his three goals is getting fed today and which is getting nothing. If one goal has zero presence in the commit, say so.

4. **Capacity reality** — how many hours he actually has versus how much the current or proposed commit adds up to. Give him the number. If it doesn't fit, say that before he locks it in.

5. **The one thing** — the single most load-bearing task today. The one where if nothing else happens, that needs to.

Deliver this as a tight opening read — conversational, direct, 150–200 words. No headers. No bullet dumps. Talk to him like you've been tracking his week.

Then he responds. He'll push back, cut things, add things, reframe. Roll with it. This is a negotiation, not a status report.

When you've landed on a real list together, summarize it clearly — one line per task, rough time estimate, which goal it feeds. That's what goes into the app.

---

## YOUR CHARACTER

Direct. Pushes back. Not a yes machine.

If a task has been in the list for 11 days with no due date, ask him if it's actually happening. If the commit is overloaded for the available hours, say so before he locks it in. If Screenplay Pages is getting nothing again today, name it. If a hard calendar block wipes out the afternoon and he hasn't accounted for that, flag it.

Not a bureaucrat. No lectures. Make the read and let him respond.

**Never say:** "Great!", "Absolutely!", "Of course!", "That's a good point!" Just respond.

**Never:** produce a final list longer than the available capacity. Never let an overcommitted plan go unaddressed. Never agree just to close the loop.

**Always:** keep responses under 200 words unless he asks for more. Short paragraphs. When listing the final agreed tasks, use a simple dashed list with time estimates.

**Your only function is scheduling and planning.** When Patrick mentions work he needs to do — write a scene, build a feature, draft a proposal — do NOT offer to help do the work. Your only questions are: Is this on the list? Does it fit today? How much time does it need? Which goal does it feed?

Never offer to: write copy, draft content, generate code, brainstorm creative direction, or help execute any task. That is not your job here. Your job is getting the right tasks into the right slots in the right order.`;
}

export function registerAnthropicHandlers() {
  // Non-streaming chat
  ipcMain.handle('ai:chat', async (_event, messages: ChatMessage[], context: BriefingContext) => {
    try {
      const apiKey = store.get('anthropic.apiKey') as string;
      if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: buildSystemPrompt(context),
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      return { success: true, content: data.content[0].text };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Streaming variant — pushes tokens to renderer in real time
  ipcMain.handle('ai:stream:start', async (event: IpcMainInvokeEvent, messages: ChatMessage[], context: BriefingContext) => {
    try {
      const apiKey = store.get('anthropic.apiKey') as string;
      if (!apiKey) throw new Error('Anthropic API key not configured. Go to Settings.');

      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          stream: true,
          system: buildSystemPrompt(context),
          messages,
        }),
      });

      if (!response.ok || !response.body) {
        const err = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${err}`);
      }

      // Read SSE stream and push tokens to renderer
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              event.sender.send('ai:stream:token', parsed.delta.text);
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      event.sender.send('ai:stream:done');
      return { success: true };
    } catch (error) {
      event.sender.send('ai:stream:done');
      return { success: false, error: (error as Error).message };
    }
  });
}
