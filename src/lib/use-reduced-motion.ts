import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const getPreference = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(QUERY).matches;

export function useReducedMotionPreference() {
  const [shouldReduceMotion, setShouldReduceMotion] =
    React.useState(getPreference);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    const updatePreference = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };

    setShouldReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  return shouldReduceMotion;
}
