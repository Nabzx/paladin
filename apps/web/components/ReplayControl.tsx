"use client";

import type { HistoryEntry } from "@/lib/replay/useIncidentRecorder";

interface ReplayControlProps {
  history: HistoryEntry[];
  scrubIndex: number | null;
  playing: boolean;
  onScrub: (index: number) => void;
  onGoLive: () => void;
  onTogglePlaying: () => void;
}

// Bottom-centre, the one quadrant none of the other overlays (Operations
// Deck top-right, mission log bottom-left, cockpit HUD bottom-right) use.
// Hidden until there's more than one recorded moment, an empty or
// single-point scrubber has nothing to scrub.
export function ReplayControl({ history, scrubIndex, playing, onScrub, onGoLive, onTogglePlaying }: ReplayControlProps) {
  if (history.length < 2) return null;

  const isLive = scrubIndex === null;
  const maxIndex = history.length - 1;
  const sliderValue = scrubIndex ?? maxIndex;
  const current = history[sliderValue];

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 border border-[var(--chrome-border)] bg-[var(--chrome-bg)] px-3 py-2 font-mono">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlaying}
          aria-label={playing ? "Pause replay" : "Play replay"}
          className="pointer-events-auto border border-[var(--chrome-border-bright)] px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--chrome-text-secondary)] transition-colors hover:border-emerald-400 hover:text-emerald-400"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={sliderValue}
          onChange={(event) => onScrub(Number(event.target.value))}
          className="pointer-events-auto h-1 flex-1 accent-emerald-400"
          aria-label="Scrub recorded incident history"
        />
        <button
          type="button"
          onClick={onGoLive}
          aria-pressed={isLive}
          className="pointer-events-auto border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] transition-colors"
          style={{
            borderColor: isLive ? "#39ff88" : "var(--chrome-border-bright)",
            color: isLive ? "#39ff88" : "var(--chrome-text-secondary)",
          }}
        >
          Live
        </button>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--chrome-text-secondary)]">
        {isLive ? "Following live" : `Replaying tick ${current.snapshot.tick}`}
      </p>
    </div>
  );
}
