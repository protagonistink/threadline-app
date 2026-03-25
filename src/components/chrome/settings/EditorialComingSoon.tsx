export function EditorialComingSoon({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="py-10">
      <div className="flex items-center gap-6 mb-8">
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="text-[10px] tracking-[0.2em] text-text-muted uppercase">In Development</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
        {items.map((item, i) => (
          <div key={i} className="flex gap-4 opacity-30 grayscale mix-blend-luminosity">
            <span className="text-xs font-mono text-text-secondary mt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-sm font-light leading-relaxed text-text-primary">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
