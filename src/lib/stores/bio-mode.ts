import { persistentAtom } from "@nanostores/persistent";
import { atom, computed } from "nanostores";

/**
 * Bio display mode - either full biography or TL;DR version
 */
export type BioMode = "full" | "tldr";

/**
 * User preference for bio mode - can be explicit or follow system preference
 */
type BioPreference = "system" | BioMode;

/** LocalStorage key for persisting bio mode preference */
const STORAGE_KEY = "bioMode";

/** Flag to check if code is running in browser environment */
const isBrowser = typeof window !== "undefined";

/**
 * Decodes stored preference value from localStorage
 * @param value - The raw string value from localStorage
 * @returns A valid BioPreference, defaulting to "system" for invalid values
 */
const decodePreference = (value?: string): BioPreference => {
  if (value === "full" || value === "tldr") {
    return value;
  }
  return "system";
};

/**
 * Determines the bio mode based on system color scheme preference
 * @returns "tldr" if user prefers dark mode, "full" otherwise
 */
const getSystemMode = (): BioMode => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return "full";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "tldr"
    : "full";
};

/**
 * Persistent atom storing user's bio mode preference in localStorage.
 * Can be "full", "tldr", or "system" (follows system dark mode preference).
 */
export const bioPreference = persistentAtom<BioPreference>(
  STORAGE_KEY,
  "system",
  {
    decode: decodePreference,
    encode: (value) => value,
  },
);

/**
 * Atom tracking the system's color scheme preference
 */
const systemMode = atom<BioMode>(getSystemMode());

/**
 * Computed atom that returns the active bio mode.
 * Respects user preference or falls back to system mode if preference is "system".
 */
export const bioMode = computed(
  [bioPreference, systemMode],
  (preference, system) => (preference === "system" ? system : preference),
);

/**
 * Sets the bio mode to a specific value
 * @param mode - The bio mode to set ("full" or "tldr")
 */
export const setBioMode = (mode: BioMode) => {
  bioPreference.set(mode);
};

/**
 * Toggles between "full" and "tldr" bio modes
 */
export const toggleBioMode = () => {
  const next = bioMode.get() === "tldr" ? "full" : "tldr";
  bioPreference.set(next);
};

const applyModeToDom = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  root.classList.toggle("dark", mode === "tldr");
  root.dataset.bioMode = mode;

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

let cleanup: (() => void) | undefined;

if (isBrowser) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const updateSystemMode = () => {
    systemMode.set(getSystemMode());
  };

  mediaQuery.addEventListener("change", updateSystemMode);

  applyModeToDom(bioMode.get());

  const unsubscribe = bioMode.listen(applyModeToDom);
  cleanup = () => {
    unsubscribe();
    mediaQuery.removeEventListener("change", updateSystemMode);
  };

  window.addEventListener("astro:page-leave", () => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });
}
