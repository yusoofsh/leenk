// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { bioMode, setBioMode, toggleBioMode } from "./bio-mode";
import { setThemeMode, themeMode, toggleThemeMode } from "./theme";

describe("display preferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBioMode("full");
    setThemeMode("light");
  });

  it("changes biography length without changing the visual theme", () => {
    toggleBioMode();

    expect(bioMode.get()).toBe("tldr");
    expect(themeMode.get()).toBe("light");
  });

  it("changes the visual theme without changing biography length", () => {
    toggleThemeMode();

    expect(themeMode.get()).toBe("dark");
    expect(bioMode.get()).toBe("full");
  });
});
