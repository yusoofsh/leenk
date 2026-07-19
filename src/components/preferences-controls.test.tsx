// @vitest-environment jsdom

import * as matchers from "@testing-library/jest-dom/matchers";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setBioMode } from "~/lib/stores/bio-mode";
import { setThemeMode } from "~/lib/stores/theme";

import ModeToggle from "./mode-toggle";
import ThemeToggle from "./theme-toggle";

expect.extend(matchers);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("display preference controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBioMode("full");
    setThemeMode("light");
  });

  it("exposes stable pressed-state names and motor-accessible targets", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <ModeToggle />
        <ThemeToggle />
      </div>,
    );

    const bioButton = screen.getByRole("button", {
      name: "TL;DR biography mode",
    });
    const themeButton = screen.getByRole("button", { name: "Dark mode" });

    expect(bioButton).toHaveAttribute("aria-pressed", "false");
    expect(themeButton).toHaveAttribute("aria-pressed", "false");
    expect(bioButton).toHaveClass("min-h-11", "min-w-11");
    expect(themeButton).toHaveClass("min-h-11", "min-w-11");

    await user.click(bioButton);

    expect(bioButton).toHaveAttribute("aria-pressed", "true");
    expect(themeButton).toHaveAttribute("aria-pressed", "false");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <div>
        <ModeToggle />
        <ThemeToggle />
      </div>,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });

  it("hydrates saved client preferences without a mismatch", async () => {
    const markup = renderToString(
      <div>
        <ModeToggle />
        <ThemeToggle />
      </div>,
    );
    const container = document.createElement("div");
    container.innerHTML = markup;
    document.body.appendChild(container);

    setBioMode("tldr");
    setThemeMode("dark");

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const root = hydrateRoot(
      container,
      <div>
        <ModeToggle />
        <ThemeToggle />
      </div>,
    );

    await act(async () => undefined);

    expect(consoleError).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "TL;DR biography mode" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Dark mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await act(async () => root.unmount());
    container.remove();
  });
});
