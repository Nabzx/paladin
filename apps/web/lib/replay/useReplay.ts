"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoryEntry } from "./useIncidentRecorder";

const PLAYBACK_INTERVAL_MS = 400;

export interface ReplayState {
  /** null means following live; a number is a frozen index into history,
   *  it does not advance as new entries are recorded. */
  scrubIndex: number | null;
  playing: boolean;
  scrubTo: (index: number) => void;
  goLive: () => void;
  togglePlaying: () => void;
}

export function useReplay(history: HistoryEntry[]): ReplayState {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const historyLengthRef = useRef(history.length);
  historyLengthRef.current = history.length;

  // Scrubbing manually always pauses playback, a competing driver of
  // scrubIndex would fight the user's own drag.
  function scrubTo(index: number): void {
    setPlaying(false);
    setScrubIndex(index);
  }

  function goLive(): void {
    setPlaying(false);
    setScrubIndex(null);
  }

  function togglePlaying(): void {
    setPlaying((value) => {
      const next = !value;
      // Starting playback from the live edge rewinds to the start, "play"
      // on an empty or already-live position has nothing to play forward.
      if (next && scrubIndex === null) setScrubIndex(0);
      return next;
    });
  }

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setScrubIndex((current) => {
        const next = (current ?? 0) + 1;
        if (next >= historyLengthRef.current) {
          setPlaying(false);
          return current;
        }
        return next;
      });
    }, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing]);

  return { scrubIndex, playing, scrubTo, goLive, togglePlaying };
}
