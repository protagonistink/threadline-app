import {
  Target,
  LayoutGrid,
  Archive,
  Settings,
  Moon,
  Sun,
  Flame,
  CalendarClock,
  CheckCircle2,
  Circle,
  ChevronsLeft,
  ChevronsRight,
  Sunrise,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { AsanaIcon, GCalIcon, GmailIcon } from './AppIcons';
import { ThreadlineLogo } from './ThreadlineLogo';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon: Icon, label, active, collapsed, onClick }: NavItemProps) {
  const { isLight, isFocus } = useTheme();

  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        'no-drag w-full flex items-center rounded-md text-[13px] transition-all duration-300',
        collapsed ? 'justify-center px-2.5 py-2' : 'gap-3 px-3 py-1.5',
        active
          ? isLight
            ? 'bg-bg-card shadow-sm text-text-emphasis font-medium shadow-[inset_3px_0_0_var(--color-accent-warm)]'
            : isFocus
              ? 'bg-bg-elevated text-text-primary font-medium'
              : 'bg-white/10 text-text-emphasis font-medium shadow-[inset_3px_0_0_var(--color-accent-warm)]'
          : 'text-text-muted/70 hover:text-text-primary hover:bg-bg-card/60'
      )}
    >
      <Icon className={cn('w-4 h-4 stroke-[1.5]', active ? 'text-accent-warm' : '', collapsed && active && 'scale-110')} />
      {!collapsed && label}
    </button>
  );
}

function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { mode, setMode } = useTheme();

  const modes: { value: ThemeMode; icon: React.ElementType }[] = [
    { value: 'dark', icon: Moon },
    { value: 'light', icon: Sun },
    { value: 'focus', icon: Flame },
  ];

  return (
    <div
      className={cn(
        'flex gap-1 rounded-lg bg-bg-card p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        collapsed ? 'flex-col items-center justify-center' : 'items-center'
      )}
    >
      {modes.map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={cn(
            'no-drag p-1.5 rounded-md transition-all duration-300',
            mode === value
              ? 'bg-bg-elevated text-text-emphasis shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

interface SidebarProps {
  onSettingsClick?: () => void;
  onShowBriefing?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function RitualsStrip() {
  const { rituals, toggleRitualComplete } = useApp();
  if (rituals.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="pt-4 pb-2">
      <div className="mb-2 px-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
          Daily Rituals
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {rituals.map((ritual) => {
          const done = ritual.completedDates.includes(today);
          return (
            <button
              key={ritual.id}
              onClick={() => toggleRitualComplete(ritual.id)}
              className="no-drag w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] text-text-muted hover:text-text-primary hover:bg-bg-card/60 transition-all text-left"
            >
              {done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-done shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className={cn('leading-snug', done && 'line-through opacity-60')}>{ritual.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ onSettingsClick, onShowBriefing, collapsed, onToggleCollapse }: SidebarProps) {
  const { isLight } = useTheme();
  const { activeView, setActiveView, activeSource, setActiveSource, openWeeklyPlanning } = useApp();

  return (
    <aside className={cn('focus-dim utility-rail paper-texture column-divider relative flex h-full shrink-0 flex-col transition-[width,opacity,border-width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] backdrop-blur-xl shadow-[24px_0_60px_rgba(0,0,0,0.22)]', collapsed ? 'w-[84px]' : 'w-[228px]')}>
      <div
        className={cn(
          'drag-region shrink-0 transition-all duration-300',
          collapsed
            ? 'flex min-h-[134px] items-end justify-center px-3 pt-[74px] pb-8'
            : 'flex min-h-[148px] items-end px-4 pt-[76px] pb-6'
        )}
      >
        <ThreadlineLogo
          collapsed={collapsed}
          className={collapsed ? 'mx-auto h-[60px] w-[60px] p-1.5' : 'ml-5 w-full max-w-[170px]'}
        />
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 overflow-y-auto hide-scrollbar pb-2',
          collapsed ? 'px-3 pt-28' : 'px-3 pt-40'
        )}
      >
        <NavItem
          icon={Target}
          label="Weekly Intentions"
          collapsed={collapsed}
          active={activeView === 'goals'}
          onClick={() => setActiveView('goals')}
        />
        <NavItem
          icon={LayoutGrid}
          label="Today's Commit"
          collapsed={collapsed}
          active={activeView === 'flow'}
          onClick={() => setActiveView('flow')}
        />
        <NavItem
          icon={Archive}
          label="Archive"
          collapsed={collapsed}
          active={activeView === 'archive'}
          onClick={() => setActiveView('archive')}
        />

        <div className="mt-4 flex flex-col gap-1">
          <button
            onClick={onShowBriefing}
            title={collapsed ? 'Morning Briefing' : undefined}
            className={cn(
              'no-drag w-full flex items-center rounded-md text-[12px] text-text-muted hover:text-accent-warm hover:bg-bg-card/60 transition-all border border-dashed border-border-subtle',
              collapsed ? 'justify-center px-2.5 py-2' : 'gap-3 px-3 py-1.5'
            )}
          >
            <Sunrise className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && 'Morning Briefing'}
          </button>
          <button
            onClick={openWeeklyPlanning}
            title={collapsed ? 'Plan Week' : undefined}
            className={cn(
              'no-drag w-full flex items-center rounded-md text-[12px] text-text-muted hover:text-text-primary hover:bg-bg-card/60 transition-all border border-dashed border-border-subtle',
              collapsed ? 'justify-center px-2.5 py-2' : 'gap-3 px-3 py-1.5'
            )}
          >
            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && 'Plan Week'}
          </button>
        </div>

        {!collapsed && <RitualsStrip />}

        {!collapsed && (
          <div className="mt-8 mb-2 px-3">
            <span className="text-[10px] uppercase tracking-[0.14em] text-text-muted font-medium">
              Sources
            </span>
          </div>
        )}

        <NavItem icon={AsanaIcon} label="Asana" collapsed={collapsed} active={activeSource === 'asana'} onClick={() => setActiveSource(activeSource === 'asana' ? 'cover' : 'asana')} />
        <NavItem icon={GCalIcon} label="Google Calendar" collapsed={collapsed} active={activeSource === 'gcal'} onClick={() => setActiveSource(activeSource === 'gcal' ? 'cover' : 'gcal')} />
        <NavItem icon={GmailIcon} label="Gmail" collapsed={collapsed} active={activeSource === 'gmail'} onClick={() => setActiveSource(activeSource === 'gmail' ? 'cover' : 'gmail')} />
      </nav>

      <div className={cn('border-t border-border-subtle flex flex-col gap-2', collapsed ? 'p-3' : 'p-3')}>
        <div className={cn(collapsed ? 'px-0 py-1 flex justify-center' : 'px-1 py-1')}>
          <ThemeSwitcher collapsed={collapsed} />
        </div>

        <NavItem icon={Settings} label="Settings" collapsed={collapsed} onClick={onSettingsClick} />

        {!collapsed ? (
          <div className="flex items-center justify-between gap-1 mt-1 px-1.5">
            <button className="no-drag flex items-center gap-3 flex-1 min-w-0 px-2.5 py-1.5 rounded-lg hover:bg-bg-card transition-colors text-left group">
              <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-[10px] display-font font-medium text-text-primary shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                P
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="text-[12px] font-medium leading-none truncate text-text-primary group-hover:text-text-emphasis transition-colors">
                  Patrick
                </div>
                <div className="text-[9px] uppercase tracking-wider text-emerald-500/90 flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  Connected
                </div>
              </div>
            </button>
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className={cn(
                'no-drag shrink-0 p-1.5 mr-1 rounded-md transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98]',
                isLight
                  ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
              )}
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className={cn(
              'no-drag flex items-center justify-center w-full py-2 rounded-lg transition-all duration-200 ease-out hover:scale-[1.03] active:scale-[0.98]',
              isLight
                ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
            )}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
