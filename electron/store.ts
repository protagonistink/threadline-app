import { ipcMain } from 'electron';
import Store from 'electron-store';

const store = new Store({
  defaults: {
    anthropic: { apiKey: '' },
    asana: { token: '' },
    gcal: {
      clientId: '',
      clientSecret: '',
      calendarId: 'primary',
      calendarIds: ['primary'],
      writeCalendarId: 'primary',
    },
    pomodoro: { workMins: 25, breakMins: 5, longBreakMins: 15, longBreakInterval: 4 },
    focus: {
      blockedSites: [
        'reddit.com',
        'news.ycombinator.com',
        'twitter.com',
        'x.com',
        'youtube.com',
        'facebook.com',
        'instagram.com',
      ],
    },
    plannerState: {
      weeklyGoals: [],
      plannedTasks: [],
      dailyPlan: { date: '', committedTaskIds: [] },
    },
    userPhysics: {
      focusBlockLength: 90,
      peakEnergyWindow: '9am–12pm',
      commonDerailers: ['email rabbit holes', 'scope creep mid-task', 'unscheduled client requests'],
      planningStyle: 'needs explicit time boxes or tasks float; works best with 2–3 deep work anchors per day',
      recoveryPattern: '30 min context-switch cost between deep work modes; back-to-back meetings kill afternoon output',
      warningSignals: ['over-scheduling mornings leaving no buffer', 'no creative/writing block before noon', 'committing more than 5h of deep work on a meeting-heavy day'],
    },
    physicsLog: [] as Array<{
      date: string;
      source: string;
      observation: string;
      data?: Record<string, unknown>;
    }>,
  },
});

export function registerStoreHandlers() {
  ipcMain.handle('store:get', (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    store.set(key, value);
    return true;
  });
}

export { store };
