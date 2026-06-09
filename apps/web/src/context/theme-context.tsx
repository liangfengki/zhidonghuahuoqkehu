"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
}>({ theme: "system", resolved: "light", setTheme: () => {} });

const STORAGE_KEY = "app-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const r: ResolvedTheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      setResolved(r);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(r);
    };
    apply();
    const handler = () => { if (theme === "system") apply(); };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
