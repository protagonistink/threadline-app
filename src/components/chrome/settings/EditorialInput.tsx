interface EditorialInputProps {
  type?: 'text' | 'password';
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  badge?: string;
  mono?: boolean;
  configured?: boolean;
}

export function EditorialInput({ type = 'text', value, onChange, placeholder, badge, mono, configured }: EditorialInputProps) {
  return (
    <div className="relative w-full max-w-md">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent border-b border-dashed border-border py-3 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-solid focus:border-accent-warm transition-all ${
          mono ? 'font-mono' : ''
        }`}
      />
      {badge && (
        <div className="absolute right-0 bottom-3 text-[10px] uppercase tracking-widest text-text-muted">{badge}</div>
      )}
      {configured && !value && (
        <div className="absolute right-0 bottom-3 text-[10px] uppercase tracking-widest text-accent-warm/50">configured</div>
      )}
    </div>
  );
}
