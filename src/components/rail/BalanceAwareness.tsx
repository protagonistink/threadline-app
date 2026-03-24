interface BalanceAwarenessProps {
  message: string | null;
}

export function BalanceAwareness({ message }: BalanceAwarenessProps) {
  if (!message) return null;

  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-whisper mb-2 block">
        BALANCE
      </span>
      <p className="text-[12px] italic text-[rgba(255,255,255,0.35)] leading-snug">
        {message}
      </p>
    </div>
  );
}
