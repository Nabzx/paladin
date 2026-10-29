"use client";

import { useEffect, useState } from "react";
import type { AgentMessage } from "@/lib/schemas/agent-protocol";
import type { TelemetrySnapshot } from "@/lib/schemas/telemetry";

// Bounds memory, not duration: at roughly one entry per message or tick,
// this comfortably covers several incidents' worth of scrubbing without
// growing unbounded over a long-running session.
const MAX_HISTORY = 300;

export interface HistoryEntry {
  snapshot: TelemetrySnapshot;
  messages: AgentMessage[];
}

// One entry per new message, not just per snapshot: the backend applies a
// fix atomically, so there's only ever one snapshot before a fault and one
// after, but the message stream carries the richer intermediate beats
// (a checking pulse, a rejected proposal, a retry) #65/#66 already render
// live. Recording at message granularity lets scrubbing show those beats
// too, not just a flat before/after graph state. A tick-only update (no
// new message, the periodic 2s loop) still records its own entry, so
// scrubbing through quiet periods advances the clock correctly.
export function useIncidentRecorder(snapshot: TelemetrySnapshot | null, messages: AgentMessage[]): HistoryEntry[] {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!snapshot) return;
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      const lastMessage = messages[messages.length - 1];
      const isNewMessage = lastMessage !== undefined && lastMessage.messageId !== last?.messages[last.messages.length - 1]?.messageId;
      const isNewTick = snapshot.tick !== last?.snapshot.tick;
      if (last && !isNewMessage && !isNewTick) return prev;

      const next = [...prev, { snapshot, messages }];
      return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
    });
  }, [snapshot, messages]);

  return history;
}
