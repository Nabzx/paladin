"use client";

import { useEffect, useState } from "react";

const ACTIVE_HOLD_MS = 1800;

export interface AgentCardProps {
  callsign: string;
  name: string;
  role: string;
  task: string;
  accent: string;
  /** messageId of this agent's most recent protocol message, of any type.
   *  A change re-triggers the active glow even if the task text (which
   *  only updates on a status_broadcast) stays the same. */
  latestMessageId: string | undefined;
}

// A crew-manifest row, not a tall profile card: five of these need to sit
// beside the console without competing with it. The bordered square is an
// empty ID-photo slot, not a finished avatar, portrait art is #60's job,
// this only reserves its place.
export function AgentCard({ callsign, name, role, task, accent, latestMessageId }: AgentCardProps) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (latestMessageId === undefined) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), ACTIVE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [latestMessageId]);


  return (
    <div
      className="flex w-72 items-stretch gap-3 border bg-black/60 px-3 py-2 font-mono transition-colors duration-500"
      style={{ borderColor: active ? accent : "#2a2f2f" }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center border text-[10px] font-bold tracking-wider transition-colors duration-500"
        style={{ borderColor: active ? accent : "#3a3f3f", color: active ? accent : "#5a6060" }}
      >
        {callsign}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.15em] text-zinc-200">{name}</span>
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-500"
            style={{
              backgroundColor: active ? accent : "transparent",
              border: active ? "none" : "1px solid #5a6060",
              boxShadow: active ? `0 0 6px 1px ${accent}` : "none",
            }}
          />
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-zinc-500">{role}</p>
        <p className="mt-1 truncate text-[11px] text-zinc-400">{task}</p>
      </div>
    </div>
  );
}
