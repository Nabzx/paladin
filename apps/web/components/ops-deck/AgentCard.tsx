"use client";

import type { ReactNode } from "react";
import { useMessageHold } from "./useMessageHold";

const ACTIVE_HOLD_MS = 1800;

export interface AgentCardProps {
  /** A small SVG glyph, see avatars.tsx, rendered inside the bordered
   *  slot that used to hold an empty placeholder (#60). */
  icon: ReactNode;
  name: string;
  role: string;
  task: string;
  accent: string;
  /** messageId of this agent's most recent protocol message, of any type.
   *  A change re-triggers the active glow even if the task text (which
   *  only updates on a status_broadcast) stays the same. */
  latestMessageId: string | undefined;
  /** When set, overrides the card's normal active/idle colour with a
   *  pulsing version of this colour, for states that need their own
   *  visual language beyond the generic active glow: ATHENA's checking
   *  pulse (#65), MERCURY's rejected-fix flash (#66). The colour and its
   *  hold duration are OpsDeck's decision, this component just renders
   *  whatever it's told. */
  pulseOverride?: string;
}

// A crew-manifest row, not a tall profile card: five of these need to sit
// beside the console without competing with it.
export function AgentCard({ icon, name, role, task, accent, latestMessageId, pulseOverride }: AgentCardProps) {
  const active = useMessageHold(latestMessageId, ACTIVE_HOLD_MS);

  const pulsing = pulseOverride !== undefined;
  const borderColor = pulseOverride ?? (active ? accent : "#2a2f2f");
  const lit = pulsing || active;

  return (
    <div
      className={`flex w-72 items-stretch gap-3 border bg-black/60 px-3 py-2 font-mono transition-colors duration-500 ${pulsing ? "animate-pulse" : ""}`}
      style={{ borderColor }}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors duration-500 ${pulsing ? "animate-pulse" : ""}`}
        style={{ borderColor: lit ? borderColor : "#3a3f3f", color: lit ? borderColor : "#5a6060" }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.15em] text-zinc-200">{name}</span>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-500 ${pulsing ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: lit ? borderColor : "transparent",
              border: lit ? "none" : "1px solid #5a6060",
              boxShadow: lit ? `0 0 6px 1px ${borderColor}` : "none",
            }}
          />
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-zinc-500">{role}</p>
        <p className="mt-1 truncate text-[11px] text-zinc-400">{task}</p>
      </div>
    </div>
  );
}
