import { Sparkles } from 'lucide-react';

interface InkLinkProps {
  onClick: () => void;
}

export function InkLink({ onClick }: InkLinkProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-[12px] text-text-muted/50 hover:text-accent-warm-hover transition-colors duration-150 group"
    >
      <Sparkles className="w-[13px] h-[13px] text-accent-warm/60 group-hover:text-accent-warm-hover transition-colors duration-150" />
      <span className="font-sans">Talk to Ink</span>
    </button>
  );
}
