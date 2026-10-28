"use client";

import type { AgentId, AgentMessage, MessageType } from "@/lib/schemas/agent-protocol";
import { AgentCard } from "./AgentCard";
import { Avatar } from "./avatars";
import { useMessageHold } from "./useMessageHold";

// Shorter than AgentCard's general ACTIVE_HOLD_MS, this one isn't filling
// the gap between messages that already arrive milliseconds apart, it's
// standing in for ATHENA's actual checking time, a snappier hold reads as
// "in progress" rather than "stuck".
const CHECKING_HOLD_MS = 1100;

// Shorter again, a flash reads as a reaction to a single event, not a
// held state, see #66.
const REJECT_FLASH_HOLD_MS = 600;

// Accents are drawn from Console.tsx's own existing colour vocabulary, not
// a fresh palette invented for this panel, so the Operations Deck reads as
// part of the same station rather than a bolted-on dashboard. ORION gets
// the console's own server-green (its "voice" already is that colour).
// VULCAN and TESLA take their domain's node colour (thermal, power).
// MERCURY takes network_link's purple, brightened for a UI accent against
// near-black rather than a graph line's own canvas. ATHENA has no fixed
// accent, see deriveAthenaAccent below.
const ATHENA_IDLE = "#8fa3b3";
const ATHENA_PASS = "#39ff88";
const ATHENA_FAIL = "#ff3344";
const ATHENA_CHECKING = "#eaf6ff";

// Same red as ATHENA_FAIL and Console.tsx's critical-node colour, "red"
// means the same thing everywhere in this app, a rejected proposal is
// MERCURY's problem to react to, not a new failure vocabulary of its own.
const MERCURY_REJECTED = ATHENA_FAIL;

const AGENTS: { id: AgentId; name: string; role: string; accent: string }[] = [
  { id: "orion", name: "ORION", role: "Command Orchestrator", accent: "#39ff88" },
  { id: "vulcan", name: "VULCAN", role: "Thermal & Fluids", accent: "#33d6ff" },
  { id: "tesla", name: "TESLA", role: "Electrical Grid", accent: "#ffcc00" },
  { id: "mercury", name: "MERCURY", role: "Workload & Routing", accent: "#9d6bff" },
  { id: "athena", name: "ATHENA", role: "Verification Gate", accent: ATHENA_IDLE },
];

function lastFrom(messages: AgentMessage[], agentId: AgentId): AgentMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].from === agentId) return messages[i];
  }
  return undefined;
}

function lastOfType(messages: AgentMessage[], agentId: AgentId, type: MessageType): AgentMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].from === agentId && messages[i].type === type) return messages[i];
  }
  return undefined;
}

function lastFailedValidation(messages: AgentMessage[]): AgentMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.from === "athena" && msg.type === "validation_result" && msg.payload.verdict === "fail") return msg;
  }
  return undefined;
}

// ATHENA's card colour is the one bold move here: not a fixed identity
// colour like the other four, it reflects her actual last verdict, green
// for pass, red for fail, the same alarm-red already used for a critical
// node in Console.tsx, so "red" means the same thing on both panels.
function deriveAthenaAccent(messages: AgentMessage[]): string {
  const lastVerdict = lastOfType(messages, "athena", "validation_result");
  if (!lastVerdict) return ATHENA_IDLE;
  return lastVerdict.payload.verdict === "pass" ? ATHENA_PASS : ATHENA_FAIL;
}

interface OpsDeckProps {
  messages: AgentMessage[];
}

export function OpsDeck({ messages }: OpsDeckProps) {
  const athenaAccent = deriveAthenaAccent(messages);
  // Her own distinct "checking" pulse, separate from the generic
  // active-on-any-message glow every other card uses, see #65: the
  // validation step itself needs to read as a moment, not just the
  // eventual pass/fail colour that follows it.
  const athenaChecking = useMessageHold(lastOfType(messages, "athena", "validation_request")?.messageId, CHECKING_HOLD_MS);
  // MERCURY is the only agent that proposes a fix today (see mercury.py),
  // so any failing validation_result is necessarily one of her proposals,
  // no need for a generic "which agent proposed this" lookup that nothing
  // else in the system would ever exercise.
  const mercuryRejected = useMessageHold(lastFailedValidation(messages)?.messageId, REJECT_FLASH_HOLD_MS);

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-2">
      {AGENTS.map((agent) => {
        const status = lastOfType(messages, agent.id, "status_broadcast");
        const task = typeof status?.payload.summary === "string" ? status.payload.summary : "standing by";

        let pulseOverride: string | undefined;
        if (agent.id === "athena" && athenaChecking) pulseOverride = ATHENA_CHECKING;
        else if (agent.id === "mercury" && mercuryRejected) pulseOverride = MERCURY_REJECTED;

        return (
          <AgentCard
            key={agent.id}
            icon={<Avatar agentId={agent.id} />}
            name={agent.name}
            role={agent.role}
            task={task}
            accent={agent.id === "athena" ? athenaAccent : agent.accent}
            latestMessageId={lastFrom(messages, agent.id)?.messageId}
            pulseOverride={pulseOverride}
          />
        );
      })}
    </div>
  );
}
