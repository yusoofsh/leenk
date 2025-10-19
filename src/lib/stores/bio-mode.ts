import { atom } from "nanostores";

export type BioMode = "detail" | "tldr";

const STORAGE_KEY = "bio-mode";
const LEGACY_KEY = "theme";
const VALID_MODES = new Set<BioMode>(["detail", "tldr"]);

const isBrowser = typeof window !== "undefined";

const readStoredMode = (): BioMode | null => {
  if (!isBrowser) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_MODES.has(stored as BioMode)) {
      return stored as BioMode;
    }

    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy === "dark" || legacy === "light") {
      return legacy === "dark" ? "tldr" : "detail";
    }
  } catch (error) {
    console.warn("Unable to read stored bio mode", error);
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

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
    window.localStorage.setItem(LEGACY_KEY, mode === "tldr" ? "dark" : "light");
  } catch (error) {
    console.warn("Unable to persist bio mode", error);
  }
};

const syncControllers = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  const toggles =
    window.document.querySelectorAll<HTMLButtonElement>("[data-mode-toggle]");
  toggles.forEach((toggle) => {
    toggle.dataset.state = mode;
    toggle.setAttribute("aria-pressed", mode === "tldr" ? "true" : "false");
  });

  const controllers = window.document.querySelectorAll<HTMLElement>(
    "[data-mode-controller]",
  );
  controllers.forEach((controller) => {
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

export const bioMode = atom<BioMode>("detail");

let initialized = false;
let persistNextChange = true;
let hasExplicitPreference = false;

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

export const initBioMode = () => {
  if (!isBrowser || initialized) {
    return;
  }

  const storedMode = readStoredMode();
  hasExplicitPreference = storedMode !== null;
  const initialMode = storedMode ?? getSystemMode();

  applyModeToDom(initialMode);
  persistNextChange = hasExplicitPreference;
  bioMode.set(initialMode);

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

  initialized = true;
};
