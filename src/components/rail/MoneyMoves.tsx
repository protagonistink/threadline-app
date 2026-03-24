interface Obligation {
  label: string;
  amount: number;
  dueDate: string;
}

interface MoneyMovesProps {
  obligations: Obligation[] | null;
  heroMode?: boolean;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MoneyMoves({ obligations, heroMode = false }: MoneyMovesProps) {
  if (!obligations || obligations.length === 0) return null;

  if (heroMode) {
    const total = obligations.reduce((sum, ob) => sum + ob.amount, 0);

    return (
      <div>
        {/* Hero amount */}
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-text-whisper">
            Week to Date
          </span>
          <div className="text-4xl font-mono font-light text-text-emphasis tracking-tight mt-0.5">
            {formatAmount(total)}
          </div>
        </div>

        {/* Detail rows */}
        <div>
          {obligations.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-2 py-2 border-b border-dashed border-border-subtle last:border-b-0"
            >
              <span className="font-sans text-[11px] text-text-muted/55 leading-tight line-clamp-1 flex-1">
                {item.label}
              </span>
              <span className="font-mono text-[11px] text-[rgba(200,60,47,0.7)] flex-shrink-0">
                {formatAmount(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Compact mode — single-line summary
  const total = obligations.reduce((sum, ob) => sum + ob.amount, 0);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-sans text-[11px] text-text-muted/55 leading-tight">
        {obligations.length} upcoming
      </span>
      <span className="font-mono text-[11px] text-[rgba(200,60,47,0.7)] flex-shrink-0">
        {formatAmount(total)}
      </span>
    </div>
  );
}
