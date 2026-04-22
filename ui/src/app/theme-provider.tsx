import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import {
  applyResolvedThemeToDocument,
  prefersDarkColorSchemeQuery,
  readStoredThemePreference,
  readSystemTheme,
  resolveThemePreference,
  themePreferenceStorageKey,
  type ResolvedTheme,
  type ThemePreference,
  writeStoredThemePreference
} from "./theme";

export interface ThemeState {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

export interface ThemeActions {
  setThemePreference: (preference: ThemePreference) => void;
}

export interface ThemeMeta {
  storageKey: string;
  systemTheme: ResolvedTheme;
}

export interface ThemeValue {
  state: ThemeState;
  actions: ThemeActions;
  meta: ThemeMeta;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readStoredThemePreference()
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => readSystemTheme());
  const resolvedTheme = resolveThemePreference(preference, systemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(prefersDarkColorSchemeQuery);
    const handleChange = (event?: MediaQueryListEvent) => {
      const nextMatches = event?.matches ?? mediaQuery.matches;

      setSystemTheme(nextMatches ? "dark" : "light");
    };

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  useEffect(() => {
    applyResolvedThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  const value: ThemeValue = {
    state: {
      preference,
      resolvedTheme
    },
    actions: {
      setThemePreference(nextPreference) {
        setPreference(nextPreference);
        writeStoredThemePreference(nextPreference);
      }
    },
    meta: {
      storageKey: themePreferenceStorageKey,
      systemTheme
    }
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return value;
}
