import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundToQuarterHour(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return Math.max(15, Math.round(minutes / 15) * 15);
}

export function formatRoundedHours(minutes: number, compact = false): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return compact ? '0h' : '0 hr';
  }

  const hours = roundToQuarterHour(minutes) / 60;
  const value = hours.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  return compact ? `${value}h` : `${value} hr`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatCurrencyFull(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) return target.toLocaleDateString('en-US', { weekday: 'short' });
  return target.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
