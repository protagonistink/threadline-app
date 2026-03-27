import { useState, useEffect, useMemo, useRef } from 'react';
import { usePlanner } from '@/context/AppContext';
import type { PomodoroState } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type FocusPhase = 'initiation' | 'active' | 'paused' | 'concluded';

const DURATION_OPTIONS = [
  { label: '15m', value: 15 },
  { label: '45m', value: 45 },
  { label: '90m', value: 90 },
  { label: '120m', value: 120 },
  { label: '180m', value: 180 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimerDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeUTC(): string {
  return new Date()
    .toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function shortId(taskId: string): string {
  // Turn task ID into "ARCH-0992-X" style session code
  const hash = taskId.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const suffix = taskId.slice(-1).toUpperCase();
  return `ARCH-${hash}-${suffix}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChromeHeader() {
  return (
    <div
      className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8"
      style={{ height: 65 }}
    >
      <span
        style={{
          fontFamily: 'Satoshi, sans-serif',
          fontSize: 22,
          fontWeight: 400,
          color: 'rgba(243,243,245,0.9)',
          letterSpacing: '0.04em',
        }}
      >
        CHRONOGRAPH
      </span>
      <nav className="flex items-center gap-6">
        {['FOCUS', 'LOG', 'GOALS', 'PLAN'].map((label, i) => (
          <span
            key={label}
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: '0.16em',
              color: i === 0 ? 'rgba(200,60,47,0.8)' : 'rgba(243,243,245,0.25)',
              cursor: 'default',
            }}
          >
            {label}
          </span>
        ))}
      </nav>
    </div>
  );
}

interface CornerDataProps {
  label: string;
  value: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

function CornerData({ label, value, position }: CornerDataProps) {
  const posClass = {
    'top-left': 'top-20 left-8',
    'top-right': 'top-20 right-8 text-right',
    'bottom-left': 'bottom-8 left-8',
    'bottom-right': 'bottom-8 right-8 text-right',
  }[position];

  return (
    <div className={`absolute ${posClass}`} style={{ lineHeight: 1.6 }}>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: 'rgba(243,243,245,0.22)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.06em',
          color: 'rgba(243,243,245,0.55)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── The Aperture Gauge ───────────────────────────────────────────────────────

interface ApertureGaugeProps {
  progress: number;
  timerDisplay: string;
  taskTitle: string;
  goalTitle?: string;
}

function ApertureGauge({ progress, timerDisplay, taskTitle, goalTitle }: ApertureGaugeProps) {
  const cx = 300;
  const cy = 300;
  // Outer rings (purely structural/ambient)
  const outerRings = [280, 245, 208, 172];
  // Inner active arc
  const arcR = 132;
  const circumference = 2 * Math.PI * arcR;
  const dashOffset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <svg
      viewBox="0 0 600 600"
      style={{ width: '100%', height: '100%', maxWidth: 600, maxHeight: 600 }}
    >
      {/* Structural crosshairs */}
      <line x1="0" y1="300" x2="600" y2="300" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
      <line x1="300" y1="0" x2="300" y2="600" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />

      {/* Outer concentric rings */}
      {outerRings.map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      ))}

      {/* Ghost task title in middle ring band */}
      <text
        x="300"
        y="252"
        textAnchor="middle"
        fill="rgba(255,255,255,0.07)"
        fontSize="20"
        fontFamily="Satoshi, -apple-system, sans-serif"
        fontWeight="300"
        letterSpacing="1"
      >
        {taskTitle}
      </text>
      {goalTitle && (
        <text
          x="300"
          y="278"
          textAnchor="middle"
          fill="rgba(255,255,255,0.045)"
          fontSize="13"
          fontFamily="Satoshi, -apple-system, sans-serif"
          fontWeight="300"
          letterSpacing="0.5"
        >
          {goalTitle}
        </text>
      )}

      {/* Inner arc track */}
      <circle
        cx={cx}
        cy={cy}
        r={arcR}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1.5"
      />

      {/* Active progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={arcR}
        fill="none"
        stroke="rgba(200,60,47,0.8)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />

      {/* Center: status label */}
      <text
        x="300"
        y="288"
        textAnchor="middle"
        fill="rgba(200,60,47,0.75)"
        fontSize="9"
        letterSpacing="4"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
      >
        FOCUSING
      </text>

      {/* Center: timer digits */}
      <text
        x="300"
        y="340"
        textAnchor="middle"
        fill="rgba(243,243,245,0.95)"
        fontSize="72"
        fontFamily="Satoshi, -apple-system, sans-serif"
        fontWeight="300"
        letterSpacing="-1"
      >
        {timerDisplay}
      </text>
    </svg>
  );
}

// ─── Phase screens ────────────────────────────────────────────────────────────

interface InitiationScreenProps {
  taskTitle: string;
  selectedDuration: number;
  onSelectDuration: (v: number) => void;
  onCommence: () => void;
  taskId: string;
}

function InitiationScreen({
  taskTitle,
  selectedDuration,
  onSelectDuration,
  onCommence,
  taskId,
}: InitiationScreenProps) {
  return (
    <>
      {/* Ambient corner data */}
      <div
        className="absolute bottom-8 left-8"
        style={{ lineHeight: 1.8 }}
      >
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'rgba(243,243,245,0.18)', letterSpacing: '0.1em' }}>
          LAT: 40.7128° N / LON: 74.0060° W
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'rgba(243,243,245,0.18)', letterSpacing: '0.1em' }}>
          APERTURE VER: 2.0.4 · PROCESS: {shortId(taskId)}
        </div>
      </div>

      {/* Center body */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: 65 }}
      >
        <div className="flex flex-col items-center" style={{ gap: 24, maxWidth: 640, width: '100%', padding: '0 48px' }}>
          {/* System label */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 500,
              color: 'rgba(243,243,245,0.35)',
              letterSpacing: '0.12em',
            }}
          >
            System.Initiation_Sequence
          </div>

          {/* Intention prompt */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 400,
              color: 'rgba(243,243,245,0.4)',
              letterSpacing: '0.08em',
            }}
          >
            What is the single intention?
          </div>

          {/* Task title — large hero */}
          <div
            style={{
              fontFamily: 'Satoshi, -apple-system, sans-serif',
              fontSize: 'clamp(40px, 8vw, 96px)',
              fontWeight: 300,
              color: 'rgba(243,243,245,0.92)',
              lineHeight: 1.05,
              textAlign: 'center',
              letterSpacing: '-0.02em',
            }}
          >
            {taskTitle}
          </div>

          {/* Duration selector */}
          <div className="flex flex-col items-center" style={{ gap: 12, marginTop: 8 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 500,
                color: 'rgba(243,243,245,0.3)',
                letterSpacing: '0.18em',
              }}
            >
              DURATION
            </div>
            {/* Current value display */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'Satoshi, -apple-system, sans-serif',
                  fontSize: 28,
                  fontWeight: 300,
                  color: 'rgba(243,243,245,0.85)',
                }}
              >
                {selectedDuration}
              </span>
              <span
                style={{
                  fontFamily: 'Satoshi, -apple-system, sans-serif',
                  fontSize: 13,
                  fontWeight: 300,
                  color: 'rgba(243,243,245,0.4)',
                }}
              >
                min
              </span>
            </div>
            {/* Duration pills */}
            <div className="flex items-center" style={{ gap: 8 }}>
              {DURATION_OPTIONS.map(({ label, value }) => {
                const isSelected = selectedDuration === value;
                return (
                  <button
                    key={value}
                    onClick={() => onSelectDuration(value)}
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      padding: '5px 10px',
                      borderRadius: 2,
                      border: isSelected
                        ? '1px solid rgba(200,60,47,0.6)'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(200,60,47,0.08)' : 'transparent',
                      color: isSelected ? 'rgba(200,60,47,0.9)' : 'rgba(243,243,245,0.35)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commence button */}
          <button
            onClick={onCommence}
            style={{
              marginTop: 16,
              width: '100%',
              maxWidth: 280,
              padding: '13px 0',
              border: '1px solid rgba(200,60,47,0.4)',
              borderRadius: 2,
              background: 'transparent',
              color: 'rgba(200,60,47,0.9)',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,60,47,0.06)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,60,47,0.7)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(200,60,47,0.4)';
            }}
          >
            COMMENCE
          </button>

          {/* ESC hint */}
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9,
              color: 'rgba(243,243,245,0.2)',
              letterSpacing: '0.14em',
              marginTop: 4,
            }}
          >
            ESC to cancel
          </div>
        </div>
      </div>
    </>
  );
}

interface ActiveScreenProps {
  timerState: PomodoroState | null;
  elapsedSeconds: number;
  taskId: string;
  taskTitle: string;
  goalTitle?: string;
  taskIndex: number;
  totalTasks: number;
  onConclude: () => void;
}

function ActiveScreen({
  timerState,
  elapsedSeconds,
  taskId,
  taskTitle,
  goalTitle,
  taskIndex,
  totalTasks,
  onConclude,
}: ActiveScreenProps) {
  const progress =
    timerState && timerState.totalTime > 0
      ? 1 - timerState.timeRemaining / timerState.totalTime
      : 0;
  const timerDisplay = timerState ? formatTimerDisplay(timerState.timeRemaining) : '00:00';

  return (
    <>
      {/* Corner anchors */}
      <CornerData
        label="SESSION.ID"
        value={`${taskIndex}/${totalTasks}`}
        position="top-left"
      />
      <CornerData
        label="ELAPSED"
        value={formatElapsed(elapsedSeconds)}
        position="top-right"
      />
      <CornerData
        label="SESSION"
        value={shortId(taskId)}
        position="bottom-left"
      />
      <CornerData
        label="PHASE"
        value="DEEP WORK"
        position="bottom-right"
      />

      {/* Aperture gauge — centered, fills available space */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: 65 }}
      >
        <div style={{ width: 'min(600px, 80vh)', height: 'min(600px, 80vh)' }}>
          <ApertureGauge
            progress={progress}
            timerDisplay={timerDisplay}
            taskTitle={taskTitle}
            goalTitle={goalTitle}
          />
        </div>
      </div>

      {/* Stop session button — bottom center */}
      <button
        onClick={onConclude}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          fontWeight: 400,
          letterSpacing: '0.16em',
          color: 'rgba(243,243,245,0.2)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 12px',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.5)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.2)';
        }}
      >
        CONCLUDE SESSION
      </button>
    </>
  );
}

interface PausedScreenProps {
  taskId: string;
  elapsedSeconds: number;
  goalTitle?: string;
  onResume: () => void;
}

function PausedScreen({ taskId, elapsedSeconds, goalTitle, onResume }: PausedScreenProps) {
  return (
    <>
      {/* Corner micro-context */}
      <CornerData label="SESSION ID" value={shortId(taskId)} position="top-left" />
      <CornerData label="ELAPSED" value={formatElapsed(elapsedSeconds)} position="top-right" />
      <CornerData label="FOCUS DEPTH" value="Deep Work / Phase II" position="bottom-left" />
      {goalTitle && (
        <CornerData label="TARGET" value={goalTitle} position="bottom-right" />
      )}

      {/* Center: PAUSED typographic statement */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: 65 }}
      >
        <div
          style={{
            fontFamily: 'Satoshi, -apple-system, sans-serif',
            fontSize: 'clamp(80px, 14vw, 160px)',
            fontWeight: 300,
            color: 'rgba(243,243,245,0.88)',
            letterSpacing: '0.08em',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          PAUSED
        </div>
        <div
          style={{
            marginTop: 16,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 400,
            color: 'rgba(243,243,245,0.3)',
            letterSpacing: '0.16em',
          }}
        >
          System on standby
        </div>

        <button
          onClick={onResume}
          style={{
            marginTop: 40,
            width: 240,
            padding: '13px 0',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 2,
            background: 'transparent',
            color: 'rgba(243,243,245,0.7)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.95)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.7)';
          }}
        >
          RESUME
        </button>
      </div>
    </>
  );
}

interface ConcludedScreenProps {
  elapsedSeconds: number;
  taskTitle: string;
  taskDone: boolean;
  concludedAtRef: React.RefObject<string>;
  onExit: () => void;
}

function ConcludedScreen({
  elapsedSeconds,
  taskTitle,
  taskDone,
  concludedAtRef,
  onExit,
}: ConcludedScreenProps) {
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;

  return (
    <>
      {/* Bottom geographic context */}
      <div
        className="absolute bottom-8 left-8"
        style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, color: 'rgba(243,243,245,0.18)', letterSpacing: '0.1em' }}
      >
        LAT: 40.7128 N / LON: 74.0060 W
      </div>

      {/* Center concluded content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ paddingTop: 65, padding: '65px 64px 48px' }}
      >
        {/* Session terminated badge */}
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.18em',
            color: 'rgba(243,243,245,0.35)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '4px 10px',
            borderRadius: 2,
            marginBottom: 24,
          }}
        >
          SESSION_TERMINATED
        </div>

        {/* "Concluded." hero */}
        <div
          style={{
            fontFamily: 'Satoshi, -apple-system, sans-serif',
            fontSize: 'clamp(60px, 9vw, 96px)',
            fontWeight: 400,
            color: 'rgba(243,243,245,0.92)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          Concluded.
        </div>

        {/* Verification line */}
        <div
          style={{
            marginTop: 20,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            fontWeight: 400,
            color: 'rgba(243,243,245,0.28)',
            letterSpacing: '0.04em',
            textAlign: 'center',
            maxWidth: 520,
            lineHeight: 1.6,
          }}
        >
          DATA INTEGRITY VERIFIED. TEMPORAL LEDGER UPDATED AT {concludedAtRef.current} UTC.
          <br />
          ALL PARAMETERS RECORDED WITHIN ARCHITECTURAL BOUNDARIES.
        </div>

        {/* Stats row */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            gap: 64,
            alignItems: 'flex-start',
          }}
        >
          {/* 01 / DURATION */}
          <div className="flex flex-col items-center" style={{ gap: 6 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 400,
                color: 'rgba(243,243,245,0.3)',
                letterSpacing: '0.14em',
              }}
            >
              01 / DURATION
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'Satoshi, -apple-system, sans-serif',
                  fontSize: 56,
                  fontWeight: 300,
                  color: 'rgba(243,243,245,0.88)',
                  lineHeight: 1,
                }}
              >
                {String(elapsedMins).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 18, fontWeight: 300, color: 'rgba(243,243,245,0.4)' }}>M</span>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 56, fontWeight: 300, color: 'rgba(243,243,245,0.88)', lineHeight: 1 }}>
                {String(elapsedSecs).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'Satoshi, sans-serif', fontSize: 18, fontWeight: 300, color: 'rgba(243,243,245,0.4)' }}>S</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.06)', alignSelf: 'center' }} />

          {/* 02 / EFFICIENCY */}
          <div className="flex flex-col items-center" style={{ gap: 6 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 400,
                color: 'rgba(243,243,245,0.3)',
                letterSpacing: '0.14em',
              }}
            >
              02 / EFFICIENCY
            </div>
            <span
              style={{
                fontFamily: 'Satoshi, -apple-system, sans-serif',
                fontSize: 56,
                fontWeight: 300,
                color: 'rgba(243,243,245,0.88)',
                lineHeight: 1,
              }}
            >
              100%
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.06)', alignSelf: 'center' }} />

          {/* 03 / PROGRESS */}
          <div className="flex flex-col items-center" style={{ gap: 6 }}>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                fontWeight: 400,
                color: 'rgba(243,243,245,0.3)',
                letterSpacing: '0.14em',
              }}
            >
              03 / PROGRESS
            </div>
            <div
              style={{
                fontFamily: 'Satoshi, -apple-system, sans-serif',
                fontSize: 22,
                fontWeight: 300,
                color: 'rgba(243,243,245,0.7)',
                lineHeight: 1.2,
                textAlign: 'center',
                maxWidth: 200,
              }}
            >
              {taskTitle}
            </div>
            <div
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                letterSpacing: '0.14em',
                color: taskDone ? 'rgba(200,60,47,0.7)' : 'rgba(243,243,245,0.3)',
              }}
            >
              {taskDone ? '● COMPLETE' : '○ IN PROGRESS'}
            </div>
          </div>
        </div>

        {/* LOG & CONTINUE */}
        <button
          onClick={onExit}
          style={{
            marginTop: 48,
            padding: '13px 40px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 2,
            background: 'transparent',
            color: 'rgba(243,243,245,0.6)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            fontWeight: 400,
            letterSpacing: '0.16em',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.22)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.92)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(243,243,245,0.6)';
          }}
        >
          LOG & CONTINUE
        </button>
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FocusViewProps {
  taskId: string;
  onExit: () => void;
}

export function FocusView({ taskId, onExit }: FocusViewProps) {
  const { plannedTasks, weeklyGoals } = usePlanner();

  const [phase, setPhase] = useState<FocusPhase>('initiation');
  const [selectedDuration, setSelectedDuration] = useState(90);
  const [timerState, setTimerState] = useState<PomodoroState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const concludedAtRef = useRef<string>(formatTimeUTC());

  const task = useMemo(
    () => plannedTasks.find((t) => t.id === taskId) ?? null,
    [plannedTasks, taskId]
  );

  const linkedGoal = useMemo(() => {
    if (!task?.weeklyGoalId) return null;
    return weeklyGoals.find((g) => g.id === task.weeklyGoalId) ?? null;
  }, [task, weeklyGoals]);

  // Task position in the plan (e.g. "1/35")
  const taskIndex = useMemo(() => {
    const idx = plannedTasks.findIndex((t) => t.id === taskId);
    return idx >= 0 ? idx + 1 : 1;
  }, [plannedTasks, taskId]);

  // IPC tick → drive phase + elapsed
  useEffect(() => {
    const cleanup = window.api.pomodoro.onTick((state) => {
      setTimerState(state);

      if (state.isRunning && !state.isPaused) {
        setPhase((prev) => (prev === 'concluded' ? 'concluded' : 'active'));
        const elapsed = Math.max(0, state.totalTime - state.timeRemaining);
        setElapsedSeconds(elapsed);
      } else if (state.isRunning && state.isPaused) {
        setPhase((prev) => (prev === 'concluded' ? 'concluded' : 'paused'));
      }
    });
    return cleanup;
  }, []);

  // ESC exits focus at any phase
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  async function handleCommence() {
    await window.api.pomodoro.start(taskId, task?.title ?? 'Focus', selectedDuration);
    setPhase('active');
  }

  async function handleResume() {
    await window.api.pomodoro.pause(); // toggles pause ↔ resume
  }

  async function handleConclude() {
    concludedAtRef.current = formatTimeUTC();
    await window.api.pomodoro.stop();
    setPhase('concluded');
  }

  const taskTitle = task?.title ?? 'Focus';
  const taskDone = task?.status === 'done';

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* Subtle noise grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.35,
        }}
      />

      <ChromeHeader />

      {phase === 'initiation' && (
        <InitiationScreen
          taskTitle={taskTitle}
          selectedDuration={selectedDuration}
          onSelectDuration={setSelectedDuration}
          onCommence={() => void handleCommence()}
          taskId={taskId}
        />
      )}

      {phase === 'active' && (
        <ActiveScreen
          timerState={timerState}
          elapsedSeconds={elapsedSeconds}
          taskId={taskId}
          taskTitle={taskTitle}
          goalTitle={linkedGoal?.title}
          taskIndex={taskIndex}
          totalTasks={plannedTasks.length}
          onConclude={() => void handleConclude()}
        />
      )}

      {phase === 'paused' && (
        <PausedScreen
          taskId={taskId}
          elapsedSeconds={elapsedSeconds}
          goalTitle={linkedGoal?.title}
          onResume={() => void handleResume()}
        />
      )}

      {phase === 'concluded' && (
        <ConcludedScreen
          elapsedSeconds={elapsedSeconds}
          taskTitle={taskTitle}
          taskDone={taskDone}
          concludedAtRef={concludedAtRef}
          onExit={onExit}
        />
      )}
    </div>
  );
}
