"use client";

interface AlarmToggleProps {
  muted: boolean;
  onToggle: () => void;
}

// A speaker glyph, on or struck through, the same hand-drawn SVG language
// as the agent avatars (#60): no icon library, currentColor throughout.
export function AlarmToggle({ muted, onToggle }: AlarmToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? "Unmute alarm klaxon" : "Mute alarm klaxon"}
      title={muted ? "Alarm muted" : "Alarm on"}
      className="pointer-events-auto flex items-center gap-1.5 border border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--chrome-text-secondary)] transition-colors hover:border-emerald-400 hover:text-emerald-400"
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10 V14 H8 L13 18 V6 L8 10 Z" />
        {!muted && <path d="M16.5 9 a4 4 0 0 1 0 6" />}
        {muted && <line x1="16" y1="8" x2="21" y2="16" />}
        {muted && <line x1="21" y1="8" x2="16" y2="16" />}
      </svg>
      {muted ? "Muted" : "Alarm"}
    </button>
  );
}
