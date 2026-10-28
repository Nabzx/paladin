"use client";

import { useMessageHold } from "./useMessageHold";

const ACTIVE_HOLD_MS = 1800;

// Neither an identity colour nor a verdict colour, a near-white "system
// working" tone that can't be mistaken for any agent's accent or for
// ATHENA's own pass/fail green and red.
const CHECKING_COLOR = "#eaf6ff";

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
  /** True while this card should show the distinct "checking" pulse
   *  instead of its normal active/idle rendering, ATHENA only, see #65. */
  checking?: boolean;
}

// A crew-manifest row, not a tall profile card: five of these need to sit
// beside the console without competing with it. The bordered square is an
// empty ID-photo slot, not a finished avatar, portrait art is #60's job,
// this only reserves its place.
export function AgentCard({ callsign, name, role, task, accent, latestMessageId, checking = false }: AgentCardProps) {
  const active = useMessageHold(latestMessageId, ACTIVE_HOLD_MS);

  const borderColor = checking ? CHECKING_COLOR : active ? accent : "#2a2f2f";
  const dotColor = checking ? CHECKING_COLOR : accent;
  const dotLit = checking || active;

  return (
    <div
      className={`flex w-72 items-stretch gap-3 border bg-black/60 px-3 py-2 font-mono transition-colors duration-500 ${checking ? "animate-pulse" : ""}`}
      style={{ borderColor }}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center border text-[10px] font-bold tracking-wider transition-colors duration-500 ${checking ? "animate-pulse" : ""}`}
        style={{ borderColor: dotLit ? borderColor : "#3a3f3f", color: dotLit ? borderColor : "#5a6060" }}
      >
        {callsign}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-[0.15em] text-zinc-200">{name}</span>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-500 ${checking ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: dotLit ? dotColor : "transparent",
              border: dotLit ? "none" : "1px solid #5a6060",
              boxShadow: dotLit ? `0 0 6px 1px ${dotColor}` : "none",
            }}
          />
        </div>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-zinc-500">{role}</p>
        <p className="mt-1 truncate text-[11px] text-zinc-400">{task}</p>
      </div>
    </div>
  );
}
