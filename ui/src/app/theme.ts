export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const themePreferenceStorageKey = "keystone.ui.theme-preference.v1";
export const prefersDarkColorSchemeQuery = "(prefers-color-scheme: dark)";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readStoredThemePreference() {
  try {
    const storage = getStorage();

    if (!storage) {
      return "system" as const;
    }

    const storedPreference = storage.getItem(themePreferenceStorageKey);

    return isThemePreference(storedPreference) ? storedPreference : "system";
  } catch {
    return "system" as const;
  }
}

export function writeStoredThemePreference(preference: ThemePreference) {
  try {
    const storage = getStorage();

    if (!storage) {
      return;
    }

    if (preference === "system") {
      storage.removeItem(themePreferenceStorageKey);
      return;
    }

    storage.setItem(themePreferenceStorageKey, preference);
  } catch {
    // Ignore storage failures and keep the in-memory theme usable.
  }
}

export function readSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light" as const;
  }

  return window.matchMedia(prefersDarkColorSchemeQuery).matches ? "dark" : "light";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemTheme: ResolvedTheme
) {
  return preference === "system" ? systemTheme : preference;
}

export function applyResolvedThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}
