// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReducedMotionPreference } from "./use-reduced-motion";

function PreferenceProbe() {
  const shouldReduceMotion = useReducedMotionPreference();
  return <output>{String(shouldReduceMotion)}</output>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useReducedMotionPreference", () => {
  it("updates when the operating-system preference changes live", () => {
    let matches = false;
    const listeners = new Set<(event: { matches: boolean }) => void>();
    const mediaQuery = {
      addEventListener: (
        _type: string,
        listener: (event: { matches: boolean }) => void,
      ) => {
        listeners.add(listener);
      },
      get matches() {
        return matches;
      },
      media: "(prefers-reduced-motion: reduce)",
      removeEventListener: (
        _type: string,
        listener: (event: { matches: boolean }) => void,
      ) => {
        listeners.delete(listener);
      },
    };

    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => mediaQuery),
    );

    render(<PreferenceProbe />);
    expect(screen.getByText("false")).toBeTruthy();

    act(() => {
      matches = true;
      for (const listener of listeners) {
        listener({ matches });
      }
    });

    expect(screen.getByText("true")).toBeTruthy();
  });
});
