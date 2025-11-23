import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage with actual storage functionality
const storage = new Map<string, string>();

const localStorageMock = {
  clear: vi.fn(() => {
    storage.clear();
  }),
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  key: vi.fn((index: number) => {
    return Array.from(storage.keys())[index] ?? null;
  }),
  get length() {
    return storage.size;
  },
  removeItem: vi.fn((key: string) => {
    storage.delete(key);
  }),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value);
  }),
};

global.localStorage = localStorageMock as Storage;

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation(
    (query: string): MediaQueryList =>
      ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }) as MediaQueryList,
  ),
  writable: true,
});
