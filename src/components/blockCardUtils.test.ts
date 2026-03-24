import { describe, it, expect } from 'vitest';
import {
  getThreadColor,
  getTintColor,
  calculateBlockHeight,
  MIN_BLOCK_HEIGHT,
  NESTED_TITLE_HEIGHT,
  NESTED_ROW_HEIGHT,
} from './blockCardUtils';

describe('getThreadColor', () => {
  it('returns warm red for goalIndex 0', () => {
    expect(getThreadColor(0)).toBe('rgba(229,85,71,0.5)');
  });

  it('returns muted blue for goalIndex 1', () => {
    expect(getThreadColor(1)).toBe('rgba(74,109,140,0.5)');
  });

  it('returns grey-blue for goalIndex 2', () => {
    expect(getThreadColor(2)).toBe('rgba(145,159,174,0.4)');
  });

  it('returns fallback slate for goalIndex 3+', () => {
    expect(getThreadColor(3)).toBe('rgba(100,116,139,0.3)');
    expect(getThreadColor(10)).toBe('rgba(100,116,139,0.3)');
  });

  it('returns fallback slate for goalIndex -1', () => {
    expect(getThreadColor(-1)).toBe('rgba(100,116,139,0.3)');
  });
});

describe('getTintColor', () => {
  it('returns warm red tint for goalIndex 0', () => {
    expect(getTintColor(0, 'focus')).toBe('rgba(229,85,71,0.025)');
  });

  it('returns muted blue tint for goalIndex 1', () => {
    expect(getTintColor(1, 'focus')).toBe('rgba(74,109,140,0.025)');
  });

  it('returns grey-blue tint for goalIndex 2', () => {
    expect(getTintColor(2, 'focus')).toBe('rgba(145,159,174,0.02)');
  });

  it('returns white whisper for unmatched goal + break', () => {
    expect(getTintColor(-1, 'break')).toBe('rgba(250,250,250,0.015)');
  });

  it('returns grey tint for unmatched goal + hard', () => {
    expect(getTintColor(-1, 'hard')).toBe('rgba(145,159,174,0.025)');
  });

  it('returns slate fallback for unmatched goal + focus', () => {
    expect(getTintColor(-1, 'focus')).toBe('rgba(100,116,139,0.02)');
  });
});

describe('calculateBlockHeight', () => {
  it('returns rawHeight when it exceeds MIN_BLOCK_HEIGHT with no nesting', () => {
    expect(calculateBlockHeight(100, 'focus', 0)).toBe(100);
  });

  it('returns MIN_BLOCK_HEIGHT when rawHeight is smaller', () => {
    expect(calculateBlockHeight(10, 'focus', 0)).toBe(MIN_BLOCK_HEIGHT);
  });

  it('returns nested min height for break block with nested tasks', () => {
    const expected = NESTED_TITLE_HEIGHT + 3 * NESTED_ROW_HEIGHT; // 32 + 60 = 92
    expect(calculateBlockHeight(10, 'break', 3)).toBe(expected);
  });

  it('uses MIN_BLOCK_HEIGHT for focus block even with nested tasks', () => {
    // nesting calc only applies to break blocks
    expect(calculateBlockHeight(10, 'focus', 3)).toBe(MIN_BLOCK_HEIGHT);
  });

  it('returns rawHeight when it exceeds nested min height', () => {
    const nestedMin = NESTED_TITLE_HEIGHT + 2 * NESTED_ROW_HEIGHT; // 72
    expect(calculateBlockHeight(200, 'break', 2)).toBe(200);
    expect(200).toBeGreaterThan(nestedMin);
  });
});
