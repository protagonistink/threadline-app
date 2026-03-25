import fs from 'node:fs';
import path from 'node:path';
import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import { getSecure, setSecure } from './secure-store';

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
      dailyPlans: [],
      viewDate: '',
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
    inkContext: {
      journalEntries: [] as Array<Record<string, unknown>>,
      lastUpdated: new Date().toISOString(),
    },
    scratch: {
      entries: [] as Array<{ id: string; text: string; createdAt: string }>,
    },
    stripe: {
      secretKey: '',
    },
    plaid: {
      clientId: '',
      secret: '',
      accessToken: '',
      itemId: '',
      institutionName: '',
      lastSync: '',
    },
    finance: {
      configured: false,
      provider: 'plaid' as 'plaid',
      weeklyPattern: [] as number[],
    },
    financeConfig: {
      flexPoolTarget: 0,
      survivalNeeds: 0,
      untouchableNeeds: 0,
    },
    // User preferences
    userPrefs: {
      ui: { themeMode: 'dark' as 'light' | 'dark' },
      day: { startHour: 9, startMin: 0, endHour: 18, endMin: 0, timeboxDefault: 60, syncFrequencyMins: 2 },
      story: { narrativeStyle: 'practical', storyDepth: 'summary', tone: 'direct', accountabilityLevel: 'firm' },
      tasks: { priorityRule: 'balanced', notificationIntensity: 'standard', distractionFiltering: 'show_all' },
      privacy: { sensitiveDataMasking: false, auditLog: false },
      moneyPrefs: { dueDateWindowDays: 7, alertSeverity: 'warning', financialSensitivity: 'soft', timeHorizonDays: 7 },
    },
  },
});

const SAFE_STORE_KEYS = new Set([
  'plannerState',
  'dayLocked',
  'dayLockedDate',
  'monthlyPlanDismissedDate',
  'appMode',
  'appModeDate',
  'appModeView',
  'appModeFocusTaskId',
  'appModeInboxOpen',
  'startOfDay.shownDate',
  'endOfDay.shownDate',
  'finance.configured',
]);

function isAllowedStoreKey(key: string) {
  return SAFE_STORE_KEYS.has(key) || key.startsWith('briefing.dismissed.');
}

export function registerStoreHandlers() {
  ipcMain.handle('store:get', (_event, key: string) => {
    if (!isAllowedStoreKey(key)) {
      throw new Error(`Renderer store access denied for key: ${key}`);
    }
    return store.get(key);
  });

  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    if (!isAllowedStoreKey(key)) {
      throw new Error(`Renderer store access denied for key: ${key}`);
    }
    store.set(key, value);
    return true;
  });

  ipcMain.handle('settings:load', () => {
    const gcal = (store.get('gcal') as Record<string, unknown> | undefined) ?? {};
    const pomodoro = (store.get('pomodoro') as Record<string, unknown> | undefined) ?? {};
    const focus = (store.get('focus') as Record<string, unknown> | undefined) ?? {};
    const prefs = (store.get('userPrefs') as Record<string, Record<string, unknown>> | undefined) ?? {};
    let buildDate: string | null = null;

    try {
      const buildArtifact = app.isPackaged
        ? process.execPath
        : path.join(app.getAppPath(), 'package.json');
      buildDate = fs.statSync(buildArtifact).mtime.toISOString();
    } catch (error) {
      console.warn('Failed to resolve build date:', error);
    }

    return {
      app: {
        version: app.getVersion(),
        buildDate,
      },
      anthropic: {
        configured: Boolean(getSecure('anthropic.apiKey')),
      },
      asana: {
        configured: Boolean(getSecure('asana.token')),
      },
      gcal: {
        clientId: String(gcal.clientId ?? ''),
        clientSecretConfigured: Boolean(gcal.clientSecret),
        calendarId: String(gcal.calendarId ?? 'primary'),
        calendarIds: Array.isArray(gcal.calendarIds) ? gcal.calendarIds : ['primary'],
        writeCalendarId: String(gcal.writeCalendarId ?? gcal.calendarId ?? 'primary'),
      },
      pomodoro: {
        workMins: Number(pomodoro.workMins ?? 25),
        breakMins: Number(pomodoro.breakMins ?? 5),
        longBreakMins: Number(pomodoro.longBreakMins ?? 15),
      },
      focus: {
        blockedSites: Array.isArray(focus.blockedSites) ? focus.blockedSites : [],
      },
      stripe: {
        configured: Boolean(getSecure('stripe.secretKey')),
      },
      finance: {
        configured: Boolean(store.get('plaid.accessToken')),
        provider: 'plaid' as const,
        institutionName: String(store.get('plaid.institutionName') || ''),
        lastSync: String(store.get('plaid.lastSync') || ''),
        plaidClientIdConfigured: Boolean(store.get('plaid.clientId')),
        plaidSecretConfigured: Boolean(store.get('plaid.secret')),
      },
      ui: {
        themeMode: prefs.ui?.themeMode === 'light' ? 'light' : 'dark',
      },
      day: {
        startHour: Number(prefs.day?.startHour ?? 9),
        startMin: Number(prefs.day?.startMin ?? 0),
        endHour: Number(prefs.day?.endHour ?? 18),
        endMin: Number(prefs.day?.endMin ?? 0),
        timeboxDefault: Number(prefs.day?.timeboxDefault ?? 60),
        syncFrequencyMins: Number(prefs.day?.syncFrequencyMins ?? 2),
      },
      story: {
        narrativeStyle: String(prefs.story?.narrativeStyle ?? 'practical'),
        storyDepth: String(prefs.story?.storyDepth ?? 'summary'),
        tone: String(prefs.story?.tone ?? 'direct'),
        accountabilityLevel: String(prefs.story?.accountabilityLevel ?? 'firm'),
      },
      tasks: {
        priorityRule: String(prefs.tasks?.priorityRule ?? 'balanced'),
        notificationIntensity: String(prefs.tasks?.notificationIntensity ?? 'standard'),
        distractionFiltering: String(prefs.tasks?.distractionFiltering ?? 'show_all'),
      },
      privacy: {
        sensitiveDataMasking: Boolean(prefs.privacy?.sensitiveDataMasking ?? false),
        auditLog: Boolean(prefs.privacy?.auditLog ?? false),
      },
      moneyPrefs: {
        dueDateWindowDays: Number(prefs.moneyPrefs?.dueDateWindowDays ?? 7),
        alertSeverity: String(prefs.moneyPrefs?.alertSeverity ?? 'warning'),
        financialSensitivity: String(prefs.moneyPrefs?.financialSensitivity ?? 'soft'),
        timeHorizonDays: Number(prefs.moneyPrefs?.timeHorizonDays ?? 7),
      },
    };
  });

  ipcMain.handle('settings:save', (_event, payload: Record<string, unknown>) => {
    // Helpers
    const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
    };
    const str = (v: unknown): string => (typeof v === 'string' ? v : '');
    const oneOf = <T extends string>(v: unknown, allowed: T[], fallback: T): T =>
      allowed.includes(v as T) ? (v as T) : fallback;
    const strArray = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];

    // Credentials (encrypted)
    if ('anthropicApiKey' in payload) setSecure('anthropic.apiKey', str(payload.anthropicApiKey));
    if ('asanaToken' in payload) setSecure('asana.token', str(payload.asanaToken));
    if ('gcalClientId' in payload) setSecure('gcal.clientId', str(payload.gcalClientId));
    if ('gcalClientSecret' in payload) setSecure('gcal.clientSecret', str(payload.gcalClientSecret));
    if ('stripeSecretKey' in payload) setSecure('stripe.secretKey', str(payload.stripeSecretKey));
    if ('plaidClientId' in payload) setSecure('plaid.clientId', str(payload.plaidClientId));
    if ('plaidSecret' in payload) setSecure('plaid.secret', str(payload.plaidSecret));

    // Calendar
    if ('gcalCalendarIds' in payload) store.set('gcal.calendarIds', strArray(payload.gcalCalendarIds));
    if ('gcalWriteCalendarId' in payload) {
      const calId = str(payload.gcalWriteCalendarId);
      store.set('gcal.writeCalendarId', calId);
      store.set('gcal.calendarId', calId);
    }

    // Pomodoro (1–120 min range)
    if ('workMins' in payload) store.set('pomodoro.workMins', clampInt(payload.workMins, 1, 120, 25));
    if ('breakMins' in payload) store.set('pomodoro.breakMins', clampInt(payload.breakMins, 1, 60, 5));
    if ('longBreakMins' in payload) store.set('pomodoro.longBreakMins', clampInt(payload.longBreakMins, 1, 60, 15));

    // Focus
    if ('blockedSites' in payload) store.set('focus.blockedSites', strArray(payload.blockedSites));

    // User preferences
    if ('themeMode' in payload) store.set('userPrefs.ui.themeMode', oneOf(payload.themeMode, ['light', 'dark', 'system'], 'dark'));
    if ('dayStartHour' in payload) store.set('userPrefs.day.startHour', clampInt(payload.dayStartHour, 0, 23, 9));
    if ('dayStartMin' in payload) store.set('userPrefs.day.startMin', clampInt(payload.dayStartMin, 0, 59, 0));
    if ('dayEndHour' in payload) store.set('userPrefs.day.endHour', clampInt(payload.dayEndHour, 0, 23, 18));
    if ('dayEndMin' in payload) store.set('userPrefs.day.endMin', clampInt(payload.dayEndMin, 0, 59, 0));
    if ('timeboxDefault' in payload) store.set('userPrefs.day.timeboxDefault', clampInt(payload.timeboxDefault, 5, 480, 60));
    if ('syncFrequencyMins' in payload) store.set('userPrefs.day.syncFrequencyMins', clampInt(payload.syncFrequencyMins, 1, 60, 2));
    if ('narrativeStyle' in payload) store.set('userPrefs.story.narrativeStyle', str(payload.narrativeStyle));
    if ('storyDepth' in payload) store.set('userPrefs.story.storyDepth', str(payload.storyDepth));
    if ('tone' in payload) store.set('userPrefs.story.tone', str(payload.tone));
    if ('accountabilityLevel' in payload) store.set('userPrefs.story.accountabilityLevel', str(payload.accountabilityLevel));
    if ('priorityRule' in payload) store.set('userPrefs.tasks.priorityRule', str(payload.priorityRule));
    if ('notificationIntensity' in payload) store.set('userPrefs.tasks.notificationIntensity', str(payload.notificationIntensity));
    if ('distractionFiltering' in payload) store.set('userPrefs.tasks.distractionFiltering', str(payload.distractionFiltering));
    if ('sensitiveDataMasking' in payload) store.set('userPrefs.privacy.sensitiveDataMasking', Boolean(payload.sensitiveDataMasking));
    if ('auditLog' in payload) store.set('userPrefs.privacy.auditLog', Boolean(payload.auditLog));
    if ('dueDateWindowDays' in payload) store.set('userPrefs.moneyPrefs.dueDateWindowDays', clampInt(payload.dueDateWindowDays, 1, 90, 7));
    if ('alertSeverity' in payload) store.set('userPrefs.moneyPrefs.alertSeverity', oneOf(payload.alertSeverity, ['info', 'warning', 'critical'], 'warning'));
    if ('financialSensitivity' in payload) store.set('userPrefs.moneyPrefs.financialSensitivity', oneOf(payload.financialSensitivity, ['soft', 'direct', 'blunt'], 'soft'));
    if ('timeHorizonDays' in payload) store.set('userPrefs.moneyPrefs.timeHorizonDays', clampInt(payload.timeHorizonDays, 1, 90, 7));
    return true;
  });
}

export { store };
