interface BalanceAwarenessProps {
  message: string | null;
}

export function BalanceAwareness({ message }: BalanceAwarenessProps) {
  if (!message) return null;

  return (
    <p className="font-display font-medium text-[11px] text-text-muted/45 leading-snug">
      {message}
    </p>
  );
}
