export function EditorialToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-[22px] rounded-full transition-colors duration-300 shrink-0 ${
        checked ? 'bg-accent-warm' : 'bg-border'
      }`}
    >
      <div
        className={`absolute top-[3px] w-4 h-4 rounded-full bg-bg transition-transform duration-300 ${
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}
