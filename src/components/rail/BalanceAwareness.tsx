interface BalanceAwarenessProps {
  message: string | null;
}

export function BalanceAwareness({ message }: BalanceAwarenessProps) {
  if (!message) return null;

  return (
    <p className="text-[12px] italic text-[rgba(255,240,220,0.35)] leading-snug">
      {message}
    </p>
  );
}
