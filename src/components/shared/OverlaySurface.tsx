import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type RefObject } from 'react';
import { cn } from '@/lib/utils';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
}

interface OverlaySurfaceProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  containerClassName?: string;
  panelClassName?: string;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  role?: 'dialog' | 'alertdialog';
}

export function OverlaySurface({
  open,
  onClose,
  children,
  labelledBy,
  describedBy,
  initialFocusRef,
  containerClassName,
  panelClassName,
  backdropClassName,
  closeOnBackdrop = true,
  role = 'dialog',
}: OverlaySurfaceProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fallbackLabelId = useId();
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousActiveRef.current = document.activeElement as HTMLElement | null;

    const focusTarget = initialFocusRef?.current;
    const firstFocusable = getFocusableElements(panelRef.current)[0];
    const nextFocus = focusTarget ?? firstFocusable ?? panelRef.current;

    window.setTimeout(() => {
      nextFocus?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = getFocusableElements(panelRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !panelRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (!active || active === last || !panelRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveRef.current?.focus?.();
    };
  }, [initialFocusRef, onClose, open]);

  if (!open) return null;

  return (
    <div
      className={cn('fixed inset-0', containerClassName)}
      aria-hidden={false}
    >
      <div
        className={cn('absolute inset-0 bg-black/40', backdropClassName)}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy ?? fallbackLabelId}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={cn('relative focus:outline-none', panelClassName)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
