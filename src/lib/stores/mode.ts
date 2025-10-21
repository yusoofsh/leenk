import { persistentAtom } from "@nanostores/persistent";
import { atom, computed } from "nanostores";

export type BioMode = "full" | "tldr";
type BioPreference = "system" | BioMode;

const STORAGE_KEY = "bio-mode";
const isBrowser = typeof window !== "undefined";

const decodePreference = (value?: string): BioPreference => {
  if (value === "full" || value === "tldr") {
    return value;
  }
  return "system";
};

const getSystemMode = (): BioMode => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return "full";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "tldr"
    : "full";
};

export const bioPreference = persistentAtom<BioPreference>(
  STORAGE_KEY,
  "system",
  {
    decode: decodePreference,
    encode: (value) => value,
  },
);

const systemMode = atom<BioMode>(getSystemMode());

export const bioMode = computed(
  [bioPreference, systemMode],
  (preference, system) => (preference === "system" ? system : preference),
);

export const setBioMode = (mode: BioMode) => {
  bioPreference.set(mode);
};

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

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", updateSystemMode);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(updateSystemMode);
  }

  applyModeToDom(bioMode.get());

  const unsubscribe = bioMode.listen(applyModeToDom);
  cleanup = () => {
    unsubscribe();
    if (typeof mediaQuery.removeEventListener === "function") {
      mediaQuery.removeEventListener("change", updateSystemMode);
    } else if (typeof mediaQuery.removeListener === "function") {
      mediaQuery.removeListener(updateSystemMode);
    }
  };

  window.addEventListener("astro:page-leave", () => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });
}
