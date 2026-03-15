import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from './lib/utils';
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
    focusResumePrompt,
    resumeFocusMode,
    dismissFocusPrompt,
    setActiveView,
  } = useApp();
  const autoBriefingCheckedRef = useRef(false);

  const checkAutoBriefing = useCallback(async (isCancelled: () => boolean) => {
    const hour = new Date().getHours();
    if (hour >= 12 || dailyPlan.committedTaskIds.length > 0) return;

    const key = `briefing.dismissed.${format(new Date(), 'yyyy-MM-dd')}`;
    const [settings, dismissed] = await Promise.all([
      window.api.settings.load(),
      window.api.store.get(key),
    ]);

    if (!isCancelled() && settings.anthropic.configured && !dismissed) {
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

  // Escape key closes Ink overlay
  useEffect(() => {
    if (!showBriefing) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowBriefing(false);
        window.api.store.set(`briefing.dismissed.${format(new Date(), 'yyyy-MM-dd')}`, true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showBriefing]);

  const sidebarIsCollapsed = isFocus || sidebarCollapsed || dayLocked || showBriefing;
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
      {/* Content area — shrinks when Ink opens via margin-right */}
      <div
        className="flex flex-1 overflow-hidden transition-[margin,padding] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ 
          marginRight: activeView === 'flow' && showBriefing ? 320 : 0
        }}
      >
        {activeView === 'flow' && (
          <>
            {/* Threads */}
            <div className={cn(
              'shrink-0 h-full overflow-hidden transition-[width,opacity] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              sourcePanelIsCollapsed ? 'w-0 min-w-0 opacity-0 pointer-events-none' : 'w-[264px] opacity-100'
            )}>
              <UnifiedInbox collapsed={sourcePanelIsCollapsed} />
            </div>
            {/* Today's Plan — slightly narrower than Day Frame */}
            <div 
              className={cn(
                'h-full overflow-hidden transition-[width,flex,opacity,margin] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                isFocus ? 'w-0 min-w-0 flex-[0_0_0%] opacity-0 pointer-events-none' : 'flex-1 min-w-[280px] opacity-100'
              )}
              style={{ flex: isFocus ? '0 0 0%' : '0.9 1 0%' }}
            >
              <TodaysFlow collapsed={dayLocked} />
            </div>
            {/* Day Frame — slightly wider than Plan */}
            <div className="flex-1 min-w-[320px] h-full overflow-hidden transition-[flex] duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ flex: '1.1 1 0%' }}>
              <Timeline />
            </div>
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
      {/* Ink panel — slides in from right, GPU-composited transform */}
      <div
        className={cn(
          'absolute top-0 right-0 h-full w-[320px] z-20 transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          showBriefing
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0 pointer-events-none'
        )}
      >
        {showBriefing && (
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
        )}
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
      {focusResumePrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-bg-card px-10 py-8 shadow-2xl max-w-sm w-full mx-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <Lock className="w-5 h-5 text-[#E55547]/70 mb-1" />
              <p className="font-display text-[22px] text-text-emphasis leading-snug">You left in focus mode.</p>
              <p className="text-[12px] text-text-muted">Resume where you left off, or start a fresh session.</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={resumeFocusMode}
                className="w-full px-5 py-2.5 bg-[#E55547]/10 hover:bg-[#E55547] text-[#E55547] hover:text-[#FAFAFA] text-[11px] uppercase tracking-[0.18em] font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Lock className="w-3 h-3" />
                Resume Focus Mode
              </button>
              <button
                onClick={dismissFocusPrompt}
                className="w-full px-5 py-2.5 text-text-muted hover:text-text-primary text-[11px] uppercase tracking-[0.18em] font-medium transition-colors duration-200"
              >
                Start Fresh Session
              </button>
            </div>
          </div>
        </div>
      )}
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
