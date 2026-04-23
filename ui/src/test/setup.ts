import "@testing-library/jest-dom/vitest";

import { beforeEach } from "vitest";

function createStorage(): Storage {
  const entries = new Map<string, string>();

  return {
    get length() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
    getItem(key) {
      return entries.get(String(key)) ?? null;
    },
    key(index) {
      return Array.from(entries.keys())[index] ?? null;
    },
    removeItem(key) {
      entries.delete(String(key));
    },
    setItem(key, value) {
      entries.set(String(key), String(value));
    }
  };
}

function installStorage(name: "localStorage" | "sessionStorage") {
  if (typeof window === "undefined") {
    return;
  }

  const storage = createStorage();

  Object.defineProperty(window, name, {
    configurable: true,
    value: storage
  });
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage
  });
}

installStorage("localStorage");
installStorage("sessionStorage");

if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  const matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    }
  });

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: matchMedia
  });
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: matchMedia
  });
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserver {
    disconnect() {}

    observe() {}

    unobserve() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: ResizeObserver
  });
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: ResizeObserver
  });
}

if (typeof window !== "undefined" && typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
  window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
}

if (typeof window !== "undefined" && typeof window.HTMLElement.prototype.scrollTo !== "function") {
  window.HTMLElement.prototype.scrollTo = function scrollTo() {};
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.classList.remove("dark", "light");
  delete document.documentElement.dataset.theme;
  document.documentElement.style.colorScheme = "";
});
