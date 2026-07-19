import { persistentAtom } from "@nanostores/persistent";

import { setThemeMode } from "./theme";

export type BioMode = "full" | "tldr";

export const DEFAULT_BIO_MODE: BioMode = "tldr";

const STORAGE_KEY = "bioMode";
const isBrowser = typeof window !== "undefined";

const decodePreference = (value?: string): BioMode => {
  if (value === "full" || value === "tldr") {
    return value;
  }
  return DEFAULT_BIO_MODE;
};

export const bioMode = persistentAtom<BioMode>(STORAGE_KEY, DEFAULT_BIO_MODE, {
  decode: decodePreference,
  encode: (value) => value,
});

export const setBioMode = (mode: BioMode) => {
  bioMode.set(mode);
};

export const toggleBioMode = () => {
  const nextMode = bioMode.get() === "tldr" ? "full" : "tldr";

  setThemeMode(nextMode === "tldr" ? "dark" : "light");
  setBioMode(nextMode);
};

const applyModeToDom = (mode: BioMode) => {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  root.dataset.bioMode = mode;
};

if (isBrowser) {
  setThemeMode(bioMode.get() === "tldr" ? "dark" : "light");
  applyModeToDom(bioMode.get());
  const unsubscribe = bioMode.listen(applyModeToDom);
  window.addEventListener("astro:page-leave", unsubscribe, { once: true });
}
