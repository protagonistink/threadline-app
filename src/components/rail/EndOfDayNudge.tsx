interface EndOfDayNudgeProps {
  visible: boolean;
  onClick: () => void;
}

export function EndOfDayNudge({ visible, onClick }: EndOfDayNudgeProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left font-display font-medium text-[11px] text-text-muted/45 hover:text-text-muted/70 transition-colors duration-150 leading-snug"
    >
      Ready to close out?
    </button>
  );
}
