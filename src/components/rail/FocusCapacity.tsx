interface FocusCapacityProps {
  hoursRemaining: number;
  label: string;
}

export function FocusCapacity({ label }: FocusCapacityProps) {
  return (
    <p className="text-[14px] font-medium italic text-[rgba(255,255,255,0.88)] leading-snug">
      {label}
    </p>
  );
}
