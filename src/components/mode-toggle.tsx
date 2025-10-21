import { useStore } from "@nanostores/react";

import { bioMode, toggleBioMode } from "~/lib/stores/bio-mode";

export function ModeToggle() {
  const mode = useStore(bioMode);

  const isTldr = mode === "tldr";

  return (
    <div
      className="not-prose flex items-center gap-2 rounded-full bg-slate-100 p-1 text-xs text-slate-600 uppercase shadow-inner ring-1 ring-slate-200 transition dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700"
      data-mode-controller
      data-state={mode}
    >
      <span className="pl-2 text-[0.5rem] font-semibold tracking-[0.3em] sm:text-[0.6rem] md:text-xs">
        Bio mode
      </span>
      <button
        type="button"
        className="relative inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.5rem] font-semibold tracking-[0.3em] text-slate-800 uppercase shadow transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:text-[0.6rem] md:text-xs dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        data-mode-toggle
        data-state={mode}
        aria-pressed={isTldr}
        onClick={() => toggleBioMode()}
      >
        <span aria-hidden="true" data-label-full>
          Switch to TL;DR
        </span>
        <span aria-hidden="true" data-label-tldr>
          Switch to full bio
        </span>
        <span className="sr-only">
          Toggle between full biography and TL;DR views
        </span>
      </button>
    </div>
  );
}

export default ModeToggle;
