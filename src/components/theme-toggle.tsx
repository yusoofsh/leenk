import { useSyncExternalStore } from "react";

import { themeMode, toggleThemeMode } from "~/lib/stores/theme";

import { PreferenceControl } from "./preference-control";

const subscribeToTheme = (onStoreChange: () => void) =>
  themeMode.subscribe(onStoreChange);
const getThemeSnapshot = () => themeMode.get();
const getServerThemeSnapshot = () => "light" as const;

export function ThemeToggle() {
  const mode = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const isDark = mode === "dark";

  return (
    <PreferenceControl
      buttonLabel="Dark mode"
      dataSlot="theme-mode-toggle"
      label="Theme"
      onToggle={toggleThemeMode}
      pressed={isDark}
      value="Dark"
    />
  );
}

export default ThemeToggle;
