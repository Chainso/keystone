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

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
