import { atom } from "nanostores";

export type BioMode = "detail" | "tldr";

const STORAGE_KEY = "bio-mode";
const VALID_MODES = new Set<BioMode>(["detail", "tldr"]);

const isBrowser = typeof window !== "undefined";

const readStoredMode = (): BioMode | null => {
  if (!isBrowser) {
    return null;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && VALID_MODES.has(stored as BioMode)) {
    return stored as BioMode;
  }

  return null;
};

const getSystemMode = (): BioMode => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return "detail";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "tldr"
    : "detail";
};

const persistMode = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, mode);
};

const syncControllers = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  window.document
    .querySelectorAll<HTMLButtonElement>("[data-mode-toggle]")
    .forEach((toggle) => {
      toggle.dataset.state = mode;
      toggle.setAttribute("aria-pressed", mode === "tldr" ? "true" : "false");
    });

  window.document
    .querySelectorAll<HTMLElement>("[data-mode-controller]")
    .forEach((controller) => {
      controller.dataset.state = mode;
    });
};

const applyModeToDom = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  root.classList.toggle("dark", mode === "tldr");
  root.dataset.bioMode = mode;
  syncControllers(mode);
};

const initialMode: BioMode = isBrowser
  ? (readStoredMode() ?? getSystemMode())
  : "detail";

export const bioMode = atom<BioMode>(initialMode);

let initialized = false;
let persistNextChange = true;
let hasExplicitPreference = isBrowser ? readStoredMode() !== null : false;

export const setBioMode = (
  mode: BioMode,
  options: { persist?: boolean } = {},
) => {
  persistNextChange = options.persist ?? true;
  bioMode.set(mode);
};

export const toggleBioMode = () => {
  const current = bioMode.get();
  setBioMode(current === "tldr" ? "detail" : "tldr");
};

const startSync = () => {
  if (!isBrowser || initialized) {
    return;
  }

  initialized = true;
  hasExplicitPreference = readStoredMode() !== null;
  persistNextChange = hasExplicitPreference;
  applyModeToDom(bioMode.get());

  const unsubscribe = bioMode.listen((mode) => {
    applyModeToDom(mode);

    if (persistNextChange) {
      persistMode(mode);
      hasExplicitPreference = true;
    }

    persistNextChange = true;
  });

  if (typeof window.matchMedia === "function") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handlePreferenceChange = (event: MediaQueryListEvent) => {
      if (hasExplicitPreference) {
        return;
      }

      setBioMode(event.matches ? "tldr" : "detail", { persist: false });
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handlePreferenceChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handlePreferenceChange);
    }

    window.addEventListener("astro:page-leave", () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handlePreferenceChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(handlePreferenceChange);
      }
    });
  }

  window.addEventListener("astro:page-leave", () => {
    unsubscribe();
  });
};

if (isBrowser) {
  startSync();
}
