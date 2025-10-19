import React from "react";
import { useStore } from "@nanostores/react";

import { bioMode, initBioMode, toggleBioMode } from "~/lib/stores/bio-mode";

export function BioModeToggle() {
  const mode = useStore(bioMode);

  React.useEffect(() => {
    initBioMode();
  }, []);

  const isTldr = mode === "tldr";

  return (
    <div
      className="not-prose flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 uppercase shadow-inner ring-1 ring-slate-200 transition dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700"
      data-mode-controller
    >
      <span className="font-semibold tracking-[0.3em]">Bio mode</span>
      <button
        type="button"
        className="relative inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[0.7rem] font-semibold tracking-[0.3em] text-slate-800 uppercase shadow transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        data-mode-toggle
        data-state={mode}
        aria-pressed={isTldr}
        onClick={() => toggleBioMode()}
      >
        <span aria-hidden="true" data-label-detail>
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

export default BioModeToggle;
