interface Intention {
  title: string;
  color: string;
}

interface IntentionsSummaryProps {
  intentions: Intention[];
}

export function IntentionsSummary({ intentions }: IntentionsSummaryProps) {
  if (intentions.length === 0) return null;

  return (
    <div className="space-y-2">
      {intentions.map((intention, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="w-[5px] h-[5px] rounded-sm flex-shrink-0 mt-[5px]"
            style={{ background: intention.color }}
          />
          <span className="font-sans text-[12px] text-[rgba(255,240,220,0.55)] leading-tight line-clamp-2">
            {intention.title}
          </span>
        </div>
      ))}
    </div>
  );
}
