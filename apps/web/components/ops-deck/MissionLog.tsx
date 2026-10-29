"use client";

import { useEffect, useRef } from "react";
import type { AgentMessage } from "@/lib/schemas/agent-protocol";

const SEVERITY_COLOR: Record<string, string> = {
  p1: "#ff3344",
  p2: "#ffaa33",
  p3: "#fbca04",
};

const NEUTRAL = "#8fa3b3";
const PASS_COLOR = "#39ff88";
const FAIL_COLOR = "#ff3344";

function agentTag(from: string): string {
  return from.toUpperCase();
}

// One line per agent-protocol message, in the station's own vocabulary
// (proposal ids, verdicts, reasons) rather than a generic "message
// received" placeholder, this is meant to read like an actual incident
// log a human would want to scroll back through.
function formatLine(message: AgentMessage): { text: string; color: string } {
  const tag = agentTag(message.from);
  const payload = message.payload;

  switch (message.type) {
    case "fault_alert": {
      const severity = String(payload.severity ?? "p3");
      return {
        text: `${tag} fault detected: ${payload.faultType} on ${asList(payload.affectedNodeIds)} [${severity}]`,
        color: SEVERITY_COLOR[severity] ?? NEUTRAL,
      };
    }
    case "status_broadcast":
      return { text: `${tag}: ${payload.summary}`, color: NEUTRAL };
    case "fix_proposal":
      return {
        text: `${tag} proposes ${payload.action} (${payload.proposalId}) -> ${asList(payload.targetNodeIds)}`,
        color: NEUTRAL,
      };
    case "validation_request":
      return { text: `${tag} validating ${payload.proposalId}`, color: NEUTRAL };
    case "validation_result": {
      const pass = payload.verdict === "pass";
      const suffix = pass ? "" : ` (${asList(payload.violatedConstraints) || payload.reasoning})`;
      return {
        text: `${tag} ${payload.proposalId} ${String(payload.verdict).toUpperCase()}${suffix}`,
        color: pass ? PASS_COLOR : FAIL_COLOR,
      };
    }
    case "commit":
      return { text: `${tag} COMMIT ${payload.proposalId}`, color: PASS_COLOR };
    case "rollback":
      return { text: `${tag} ROLLBACK ${payload.proposalId}: ${payload.reason}`, color: FAIL_COLOR };
    default:
      return { text: `${tag} ${message.type}`, color: NEUTRAL };
  }
}

function asList(value: unknown): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

interface MissionLogProps {
  messages: AgentMessage[];
}

// Newest at the bottom, auto-scrolled there as entries arrive, the
// convention a terminal or flight recorder readout already uses, not a
// feed that pushes new entries out of view at the top.
export function MissionLog({ messages }: MissionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 w-[32rem] max-w-[calc(100vw-2rem)] border border-[var(--chrome-border)] bg-[var(--chrome-bg)] font-mono">
      <div className="border-b border-[var(--chrome-border)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--chrome-text-secondary)]">
        Mission Log
      </div>
      <div ref={scrollRef} className="h-36 overflow-y-auto px-3 py-2 text-[11px] leading-5">
        {messages.length === 0 && <p className="text-[var(--chrome-text-secondary)]">no activity yet</p>}
        {messages.map((message) => {
          const { text, color } = formatLine(message);
          return (
            <p key={message.messageId} style={{ color }} className="whitespace-nowrap">
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
}
