// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { bioMode, setBioMode, toggleBioMode } from "./bio-mode";
import { setThemeMode, themeMode, toggleThemeMode } from "./theme";

describe("display preferences", () => {
  beforeEach(() => {
    window.localStorage?.clear();
    setBioMode("full");
    setThemeMode("light");
  });

  it("maps TL;DR to dark and the full biography to light", () => {
    toggleBioMode();

    expect(bioMode.get()).toBe("tldr");
    expect(themeMode.get()).toBe("dark");

    toggleBioMode();

    expect(bioMode.get()).toBe("full");
    expect(themeMode.get()).toBe("light");
  });

  it("changes the visual theme without changing biography length", () => {
    toggleThemeMode();

    expect(themeMode.get()).toBe("dark");
    expect(bioMode.get()).toBe("full");
  });
});
