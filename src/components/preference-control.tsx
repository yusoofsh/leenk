type PreferenceControlProps = {
  buttonLabel: string;
  dataSlot: string;
  label: string;
  onToggle: () => void;
  pressed: boolean;
  value: string;
};

export function PreferenceControl({
  buttonLabel,
  dataSlot,
  label,
  onToggle,
  pressed,
  value,
}: PreferenceControlProps) {
  return (
    <div className="not-prose flex items-center gap-1 rounded-full bg-slate-100 p-1 text-slate-600 uppercase shadow-inner ring-1 ring-slate-200 transition-colors dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700">
      <span className="pl-2 text-[0.625rem] font-semibold tracking-[0.2em] sm:text-xs">
        {label}
      </span>
      <button
        aria-label={buttonLabel}
        aria-pressed={pressed}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white px-3 py-2 text-[0.625rem] font-semibold tracking-[0.2em] text-slate-800 uppercase shadow transition-[color,background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 active:scale-[0.97] motion-reduce:transition-colors motion-reduce:active:scale-100 sm:text-xs dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        data-slot={dataSlot}
        onClick={onToggle}
        type="button"
      >
        {value}
      </button>
    </div>
  );
}
