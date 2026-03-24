type BlockKind = 'hard' | 'focus' | 'break';

export function getThreadColor(goalIndex: number): string {
  if (goalIndex === 0) return 'rgba(229,85,71,0.5)';
  if (goalIndex === 1) return 'rgba(74,109,140,0.5)';
  if (goalIndex === 2) return 'rgba(145,159,174,0.4)';
  return 'rgba(100,116,139,0.3)';
}

export function getTintColor(goalIndex: number, blockKind: BlockKind): string {
  if (goalIndex === 0) return 'rgba(229,85,71,0.025)';
  if (goalIndex === 1) return 'rgba(74,109,140,0.025)';
  if (goalIndex === 2) return 'rgba(145,159,174,0.02)';
  if (blockKind === 'break') return 'rgba(250,250,250,0.015)';
  if (blockKind === 'hard') return 'rgba(145,159,174,0.025)';
  return 'rgba(100,116,139,0.02)';
}

export const MIN_BLOCK_HEIGHT = 32;
export const NESTED_TITLE_HEIGHT = 32;
export const NESTED_ROW_HEIGHT = 20;

export function calculateBlockHeight(
  rawHeight: number,
  blockKind: BlockKind,
  nestedCount: number,
): number {
  const nestedMinHeight = blockKind === 'break' && nestedCount > 0
    ? NESTED_TITLE_HEIGHT + nestedCount * NESTED_ROW_HEIGHT
    : MIN_BLOCK_HEIGHT;
  return Math.max(rawHeight, nestedMinHeight, MIN_BLOCK_HEIGHT);
}
