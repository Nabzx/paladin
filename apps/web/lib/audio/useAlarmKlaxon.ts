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

// Square-wave oscillators, not the klaxon's sawtooth: #114's research
// confirmed (at the raw PCM sample level, not just by calling the API)
// that square is the actual NES/Game Boy APU waveform, the defining
// chiptune sound, where sawtooth reads as a harsher alarm buzz.
const NOTE_DURATION_SECONDS = 0.08;
const NOTE_PEAK_GAIN = 0.16;

// A short "blip" per note: fast attack, quick decay, #114's confirmed
// envelope shape for a chiptune note (not a sustained tone).
function playNote(context: AudioContext, frequency: number, startTime: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  gain.connect(context.destination);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(NOTE_PEAK_GAIN, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + NOTE_DURATION_SECONDS);

  oscillator.start(startTime);
  oscillator.stop(startTime + NOTE_DURATION_SECONDS + 0.01);
}

// C5, E5, G5, C6: the classic ascending "coin/success" arpeggio, #114's
// worked example.
const COMMIT_NOTES_HZ = [523.25, 659.25, 783.99, 1046.5];
// The same four notes, descending: #114's recommended "inverse shape"
// for the rollback/fail cue, distinct from the commit jingle without
// inventing a second note set.
const ROLLBACK_NOTES_HZ = [...COMMIT_NOTES_HZ].reverse();

function playArpeggio(context: AudioContext, notesHz: number[]): void {
  const now = context.currentTime;
  notesHz.forEach((hz, i) => playNote(context, hz, now + i * NOTE_DURATION_SECONDS));
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
  // A lazy initialiser, not a separate read effect: reading and writing in
  // two different effects races on mount, the write effect can fire with
  // the stale default before the read effect's setMuted has landed and
  // overwrite the real stored value with it, found live testing a reload.
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  });
  const contextRef = useRef<AudioContext | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

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

  // Every new message, found by set membership rather than "the
  // array's last entry": a fault's whole resolution trace (fault_alert,
  // ..., commit or rollback) can arrive batched into one render (the
  // same real failure #120's agent movement hit and fixed this way),
  // and missing a commit/rollback cue entirely is worse than the old
  // single-message check missing an already-redundant intermediate one.
  useEffect(() => {
    const seen = seenMessageIdsRef.current;
    for (const message of messages) {
      if (seen.has(message.messageId)) continue;
      seen.add(message.messageId);
      if (!muted && contextRef.current) {
        if (message.type === "fault_alert") playKlaxon(contextRef.current);
        else if (message.type === "commit") playArpeggio(contextRef.current, COMMIT_NOTES_HZ);
        else if (message.type === "rollback") playArpeggio(contextRef.current, ROLLBACK_NOTES_HZ);
      }
    }
  }, [messages, muted]);

  return { muted, toggleMuted: () => setMuted((value) => !value) };
}
