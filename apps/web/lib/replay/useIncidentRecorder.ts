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

// Records on a new message OR a new tick, not only on a new snapshot: the
// backend applies a fix atomically, so there's only ever one snapshot
// before a fault and one after, a snapshot-only recording would scrub as
// a flat before/after with nothing in between. In practice a whole fault
// response's messages usually arrive within the same React commit (the
// backend resolves and broadcasts the full trace in milliseconds, and
// React 18 batches state updates that land in the same task), so this
// typically yields a handful of steps per incident (quiet -> fault
// detected -> resolved), not one step per individual message, scrubbing
// still moves through genuinely distinct recorded moments, just coarser
// than per-message, found live verifying this.
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
