interface EditorialRowProps {
  kicker: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function EditorialRow({ kicker, title, description, children }: EditorialRowProps) {
  return (
    <div className="py-8 flex flex-col lg:flex-row lg:items-start gap-8 lg:gap-16 border-b border-dashed border-border last:border-0 group">
      <div className="w-full lg:w-[420px] shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-text-whisper group-hover:bg-accent-warm/50 transition-colors" />
          <span className="text-[10px] tracking-[0.2em] font-medium uppercase text-text-muted group-hover:text-accent-warm transition-colors">
            {kicker}
          </span>
        </div>
        <h3 className="text-2xl text-text-emphasis mb-3 font-serif">{title}</h3>
        {description && (
          <p className="text-[13px] leading-relaxed text-text-secondary font-light">{description}</p>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-center pt-2">
        {children}
      </div>
    </div>
  );
}
