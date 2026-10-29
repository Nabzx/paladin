"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "paladin-chrome-theme";

export type Theme = "dark" | "light";

export interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

// A lazy useState initialiser, not a separate read effect, from the start:
// #61's mute toggle found that reading localStorage in one effect and
// writing it in another races on mount, the write effect can fire with
// the stale default before the read effect's setter has landed. No reason
// to repeat that mistake here.
export function useTheme(): ThemeState {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return { theme, toggleTheme: () => setTheme((value) => (value === "dark" ? "light" : "dark")) };
}
