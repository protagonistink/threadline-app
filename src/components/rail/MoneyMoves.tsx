interface Obligation {
  label: string;
  amount: number;
  dueDate: string;
}

interface MoneyMovesProps {
  obligations: Obligation[] | null;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MoneyMoves({ obligations }: MoneyMovesProps) {
  if (!obligations || obligations.length === 0) return null;

  return (
    <div className="space-y-2">
      {obligations.map((item, i) => (
        <div key={i} className="flex items-start justify-between gap-2">
          <span className="font-sans text-[11px] text-text-muted/55 leading-tight line-clamp-1 flex-1">
            {item.label}
          </span>
          <span className="font-sans text-[11px] text-text-muted/55 flex-shrink-0">
            {formatAmount(item.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
