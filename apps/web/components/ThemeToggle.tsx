"use client";

import type { Theme } from "@/lib/theme/useTheme";

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

// A sun/moon glyph, the same hand-drawn SVG language as the agent avatars
// (#60) and the alarm toggle (#61): no icon library, currentColor.
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isLight}
      aria-label={isLight ? "Switch the chrome to dark" : "Switch the chrome to light"}
      title={isLight ? "Chrome: light" : "Chrome: dark"}
      className="pointer-events-auto flex items-center gap-1.5 border border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--chrome-text-secondary)] transition-colors hover:border-emerald-400 hover:text-emerald-400"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {isLight ? (
          <circle cx="12" cy="12" r="5" />
        ) : (
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        )}
      </svg>
      {isLight ? "Light" : "Dark"}
    </button>
  );
}
