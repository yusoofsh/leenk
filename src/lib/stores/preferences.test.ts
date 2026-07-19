// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  bioMode,
  DEFAULT_BIO_MODE,
  setBioMode,
  toggleBioMode,
} from "./bio-mode";
import { DEFAULT_THEME_MODE, setThemeMode, themeMode } from "./theme";

describe("display preferences", () => {
  beforeEach(() => {
    window.localStorage?.clear();
    setBioMode("full");
    setThemeMode("light");
  });

  it("defaults new visitors to the TL;DR biography", () => {
    expect(DEFAULT_BIO_MODE).toBe("tldr");
    expect(DEFAULT_THEME_MODE).toBe("dark");
  });

  it("maps TL;DR to dark and the full biography to light", () => {
    toggleBioMode();

    expect(bioMode.get()).toBe("tldr");
    expect(themeMode.get()).toBe("dark");

    toggleBioMode();

    expect(bioMode.get()).toBe("full");
    expect(themeMode.get()).toBe("light");
  });
});
