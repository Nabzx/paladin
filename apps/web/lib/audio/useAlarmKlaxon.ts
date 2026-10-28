"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentMessage } from "@/lib/schemas/agent-protocol";

const MUTE_STORAGE_KEY = "paladin-alarm-muted";

// A classic two-tone wail, synthesised rather than a shipped audio file,
// the same reasoning as the hand-rolled dashed flow (#52) and flicker
// burst (#57): no binary asset to fetch or license, and every parameter
// stays inspectable in code.
const LOW_HZ = 523;
const HIGH_HZ = 659;
const SWEEP_SECONDS = 0.15;
const SWEEPS = 4;
const PEAK_GAIN = 0.18;

function playKlaxon(context: AudioContext): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.connect(gain);
  gain.connect(context.destination);

  const now = context.currentTime;
  const duration = SWEEP_SECONDS * SWEEPS * 2;

  oscillator.frequency.setValueAtTime(LOW_HZ, now);
  for (let i = 0; i < SWEEPS; i += 1) {
    oscillator.frequency.linearRampToValueAtTime(HIGH_HZ, now + (i * 2 + 1) * SWEEP_SECONDS);
    oscillator.frequency.linearRampToValueAtTime(LOW_HZ, now + (i * 2 + 2) * SWEEP_SECONDS);
  }

  // Short linear ramps at both ends, not a hard on/off, an abrupt gain
  // jump is an audible click, not a clean cue.
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(PEAK_GAIN, now + 0.01);
  gain.gain.setValueAtTime(PEAK_GAIN, now + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

export interface AlarmKlaxonState {
  muted: boolean;
  toggleMuted: () => void;
}

// A fault_alert is only ever broadcast at the moment a fault is injected,
// never replayed to a reconnecting client (only the snapshot is, on
// connect), so unlike #57's flicker burst this needs no "already active on
// first sync" guard, every fault_alert this hook ever sees is genuinely new.
export function useAlarmKlaxon(messages: AgentMessage[]): AlarmKlaxonState {
  const [muted, setMuted] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const lastMessageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const stored = window.localStorage.getItem(MUTE_STORAGE_KEY);
    if (stored !== null) setMuted(stored === "true");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
  }, [muted]);

  // AudioContext can't play before a user gesture (browser autoplay
  // policy), created lazily and resumed on the page's first interaction,
  // not tied to the mute toggle specifically, an unlucky visitor who never
  // touches the toggle should still hear the first fault after any click.
  useEffect(() => {
    function unlock() {
      if (!contextRef.current) contextRef.current = new AudioContext();
      if (contextRef.current.state === "suspended") void contextRef.current.resume();
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.messageId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = last.messageId;
    if (last.type === "fault_alert" && !muted && contextRef.current) {
      playKlaxon(contextRef.current);
    }
  }, [messages, muted]);

  return { muted, toggleMuted: () => setMuted((value) => !value) };
}
