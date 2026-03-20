import { useCallback, useEffect, useState } from 'react';

interface DayLockResult {
  dayLocked: boolean;
  focusResumePrompt: boolean;
  lockDay: () => void;
  unlockDay: () => void;
  resumeFocusMode: () => void;
  dismissFocusPrompt: () => void;
}

export function useDayLock(): DayLockResult {
  const [dayLocked, setDayLocked] = useState(false);
  const [focusResumePrompt, setFocusResumePrompt] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    void Promise.all([
      window.api.store.get('dayLocked'),
      window.api.store.get('dayLockedDate'),
    ]).then(([locked, lockedDate]) => {
      if (locked) {
        if (lockedDate === today) {
          setFocusResumePrompt(true);
        } else {
          void window.api.store.set('dayLocked', false);
          void window.api.store.set('dayLockedDate', null);
        }
      }
    });
  }, []);

  const lockDay = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    void window.api.store.set('dayLocked', true);
    void window.api.store.set('dayLockedDate', today);
    setDayLocked(true);
  }, []);

  const unlockDay = useCallback(() => {
    void window.api.store.set('dayLocked', false);
    setDayLocked(false);
  }, []);

  const resumeFocusMode = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    void window.api.store.set('dayLocked', true);
    void window.api.store.set('dayLockedDate', today);
    setFocusResumePrompt(false);
    setDayLocked(true);
  }, []);

  const dismissFocusPrompt = useCallback(() => {
    setFocusResumePrompt(false);
    void window.api.store.set('dayLocked', false);
    void window.api.store.set('dayLockedDate', null);
  }, []);

  return { dayLocked, focusResumePrompt, lockDay, unlockDay, resumeFocusMode, dismissFocusPrompt };
}
