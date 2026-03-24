const FALLBACK_GOAL_COLORS = ['rgb(167,139,250)', 'rgb(45,212,191)', 'rgb(251,191,36)'];

const GOAL_COLOR_TOKENS: Record<string, string> = {
  'bg-accent-warm': 'rgb(200,60,47)',
  'bg-done': 'rgb(130,130,130)',
  'bg-accent-green': 'rgb(91,138,94)',
};

function isDirectCssColor(value: string) {
  return /^(#|rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color\()/i.test(value.trim());
}

export function resolveGoalColor(goalColor: string | null | undefined, goalIndex: number) {
  if (goalColor) {
    if (isDirectCssColor(goalColor)) return goalColor;
    const tokenColor = GOAL_COLOR_TOKENS[goalColor];
    if (tokenColor) return tokenColor;
  }

  return FALLBACK_GOAL_COLORS[goalIndex] ?? 'rgb(100,116,139)';
}

export function withAlpha(color: string, alpha: number) {
  const normalized = color.trim();

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);
    const sizedHex = hex.length === 3
      ? hex.split('').map((char) => char + char).join('')
      : hex.length === 6
        ? hex
        : hex.length === 8
          ? hex.slice(0, 6)
          : null;

    if (sizedHex) {
      const red = parseInt(sizedHex.slice(0, 2), 16);
      const green = parseInt(sizedHex.slice(2, 4), 16);
      const blue = parseInt(sizedHex.slice(4, 6), 16);
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const [red = '100', green = '116', blue = '139'] = rgbMatch[1].split(',').map((part) => part.trim());
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return `color-mix(in srgb, ${normalized} ${Math.max(0, Math.min(alpha, 1)) * 100}%, transparent)`;
}
