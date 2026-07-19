import { persistentAtom } from "@nanostores/persistent";
import { atom, computed } from "nanostores";

export type ThemeMode = "dark" | "light";
type ThemePreference = "system" | ThemeMode;

const STORAGE_KEY = "themeMode";
const isBrowser = typeof window !== "undefined";

const decodePreference = (value?: string): ThemePreference => {
  if (value === "dark" || value === "light") {
    return value;
  }
  return "system";
};

const getSystemMode = (): ThemeMode => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const themePreference = persistentAtom<ThemePreference>(
  STORAGE_KEY,
  "system",
  {
    decode: decodePreference,
    encode: (value) => value,
  },
);

const systemMode = atom<ThemeMode>(getSystemMode());

export const themeMode = computed(
  [themePreference, systemMode],
  (preference, system) => (preference === "system" ? system : preference),
);

export const setThemeMode = (mode: ThemeMode) => {
  themePreference.set(mode);
};

export const toggleThemeMode = () => {
  setThemeMode(themeMode.get() === "dark" ? "light" : "dark");
};

const applyThemeToDom = (mode: ThemeMode) => {
  if (!isBrowser) {
    return;
  }

  const root = window.document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.themeMode = mode;
};

if (isBrowser) {
  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;
  const updateSystemMode = () => {
    systemMode.set(getSystemMode());
  };

  mediaQuery?.addEventListener("change", updateSystemMode);
  applyThemeToDom(themeMode.get());

  const unsubscribe = themeMode.listen(applyThemeToDom);
  window.addEventListener(
    "astro:page-leave",
    () => {
      unsubscribe();
      mediaQuery?.removeEventListener("change", updateSystemMode);
    },
    { once: true },
  );
}
