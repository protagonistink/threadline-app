import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Sparkles } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { UnifiedInbox } from './components/UnifiedInbox';
import { TodaysFlow } from './components/TodaysFlow';
import { Timeline } from './components/Timeline';
import { PomodoroTimer } from './components/PomodoroTimer';
import { DragOverlay } from './components/DragOverlay';
import { AtmosphereLayer } from './components/AtmosphereLayer';
import { useTheme } from './context/ThemeContext';

const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const CommandPalette = lazy(() => import('./components/CommandPalette').then((module) => ({ default: module.CommandPalette })));
const WeeklyIntentions = lazy(() => import('./components/WeeklyIntentions').then((module) => ({ default: module.WeeklyIntentions })));
const WeeklyPlanningWizard = lazy(() => import('./components/WeeklyPlanningWizard').then((module) => ({ default: module.WeeklyPlanningWizard })));
const MonthlyPlanningWizard = lazy(() => import('./components/MonthlyPlanningWizard').then((module) => ({ default: module.MonthlyPlanningWizard })));
const InkThread = lazy(() => import('./components/Thread').then((module) => ({ default: module.InkThread })));
const MorningBriefing = lazy(() => import('./components/MorningBriefing').then((module) => ({ default: module.MorningBriefing })));

function ArchiveView() {
  const { archiveTasks } = useApp();

  return (
    <div className="flex-1 bg-bg px-8 py-8 overflow-y-auto">
      <div className="rounded-lg border border-border bg-bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-medium text-text-emphasis">Archive</h2>
          <span className="text-[11px] font-mono text-text-muted">{archiveTasks.length} kept</span>
        </div>
        <div className="flex flex-col gap-3">
          {archiveTasks.length === 0 ? (
            <div className="text-[13px] text-text-muted">Nothing has moved out of the day yet.</div>
          ) : (
            archiveTasks.map((task) => (
              <div key={task.id} className="rounded-md border border-border-subtle bg-bg px-4 py-3">
                <div className="text-[13px] text-text-primary">{task.title}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted mt-1">{task.status}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const [showSettings, setShowSettings] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingSessionId, setBriefingSessionId] = useState(0);
  const [briefingMode, setBriefingMode] = useState<'briefing' | 'chat'>('briefing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isFocus } = useTheme();
  const {
    activeView,
    weeklyPlanningLastCompleted,
    openWeeklyPlanning,
    dailyPlan,
    dayLocked,
    setActiveView,
  } = useApp();
  const autoBriefingCheckedRef = useRef(false);

  const checkAutoBriefing = useCallback(async (isCancelled: () => boolean) => {
    const hour = new Date().getHours();
    if (hour >= 12 || dailyPlan.committedTaskIds.length > 0) return;

    const key = `briefing.dismissed.${format(new Date(), 'yyyy-MM-dd')}`;
    const [apiKey, dismissed] = await Promise.all([
      window.api.store.get('anthropic.apiKey'),
      window.api.store.get(key),
    ]);

    if (!isCancelled() && apiKey && !dismissed) {
      setBriefingMode('briefing');
      setShowBriefing(true);
    }
  }, [dailyPlan.committedTaskIds.length]);

  // Auto-open briefing: before noon, no commits yet, API key configured
  useEffect(() => {
    if (autoBriefingCheckedRef.current) return;
    autoBriefingCheckedRef.current = true;

    let cancelled = false;
    void checkAutoBriefing(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [checkAutoBriefing]);

  useEffect(() => {
    const now = new Date();
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const isMondayMorning = now.getDay() === 1 && now.getHours() < 12;

    if (isMondayMorning && (!weeklyPlanningLastCompleted || weeklyPlanningLastCompleted < weekStart)) {
      openWeeklyPlanning();
    }
  }, [openWeeklyPlanning, weeklyPlanningLastCompleted]);

  const sidebarIsCollapsed = isFocus || sidebarCollapsed;
  const sourcePanelIsCollapsed = isFocus || dayLocked;

  return (
    <div className="grain cinematic-shell relative flex h-screen w-full bg-bg text-text-primary font-sans overflow-hidden transition-colors duration-700">
      <div className="drag-region" />
      <AtmosphereLayer />
      <Sidebar
        collapsed={sidebarIsCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        onSettingsClick={() => setShowSettings(true)}
        onShowBriefing={() => { setBriefingMode('briefing'); setShowBriefing(true); }}
      />
      <div className="flex flex-1 overflow-hidden">
        {activeView === 'flow' && (
          <>
            <UnifiedInbox collapsed={sourcePanelIsCollapsed} />
            <TodaysFlow collapsed={dayLocked} />
            {showBriefing ? (
              <Suspense fallback={null}>
                <MorningBriefing
                  key={briefingSessionId}
                  mode={briefingMode}
                  onClose={() => {
                    setShowBriefing(false);
                    window.api.store.set(`briefing.dismissed.${format(new Date(), 'yyyy-MM-dd')}`, true);
                  }}
                  onNewChat={() => setBriefingSessionId((value) => value + 1)}
                />
              </Suspense>
            ) : (
              <Timeline />
            )}
          </>
        )}
        {activeView === 'goals' && (
          <>
            <UnifiedInbox collapsed={isFocus} />
            <Suspense fallback={null}>
              <WeeklyIntentions />
            </Suspense>
          </>
        )}
        {activeView === 'archive' && <ArchiveView />}
      </div>
      {showSettings && (
        <Suspense fallback={null}>
          <Settings onClose={() => setShowSettings(false)} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <WeeklyPlanningWizard />
      </Suspense>
      <Suspense fallback={null}>
        <MonthlyPlanningWizard />
      </Suspense>
      <DragOverlay />
      <Suspense fallback={null}>
        <InkThread />
      </Suspense>
      {!showBriefing && (
        <button
          onClick={() => {
            setActiveView('flow');
            setBriefingMode('chat');
            setBriefingSessionId((value) => value + 1);
            setShowBriefing(true);
          }}
          title="Open Ink"
          aria-label="Open Ink"
          className="no-drag absolute bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-card/92 text-text-muted shadow-[0_16px_40px_rgba(0,0,0,0.24)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-accent-warm/35 hover:text-accent-warm"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}
      <div className="absolute h-px w-px overflow-hidden -left-[9999px] top-0">
        <PomodoroTimer />
      </div>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <DndProvider backend={HTML5Backend}>
          <AppLayout />
        </DndProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
