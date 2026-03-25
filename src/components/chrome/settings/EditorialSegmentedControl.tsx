interface EditorialSegmentedControlProps<T extends string | number> {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (val: T) => void;
}

export function EditorialSegmentedControl<T extends string | number>({ options, value, onChange }: EditorialSegmentedControlProps<T>) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`px-5 py-2 text-[12px] tracking-wide transition-all duration-300 rounded-[4px] outline-none ${
              isActive
                ? 'border border-accent-warm/50 text-accent-warm bg-accent-warm/5 shadow-[0_0_10px_rgba(200,60,47,0.05)]'
                : 'border border-border text-text-secondary hover:text-text-primary hover:border-border-hover'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
