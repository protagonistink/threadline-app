interface FocusCapacityProps {
  hoursRemaining: number;
  label: string;
}

export function FocusCapacity({ label }: FocusCapacityProps) {
  return (
    <p className="font-sans text-[12px] text-text-muted/70 leading-snug italic">
      {label}
    </p>
  );
}
