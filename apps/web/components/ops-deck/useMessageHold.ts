"use client";

import { useEffect, useState } from "react";

// True for holdMs after messageId changes, then false again. The backend's
// whole response trace for one fault arrives in milliseconds, so a purely
// real-time "is this agent active right now" signal would be imperceptible,
// this gives each discrete event a deliberately dramatized, visible hold.
export function useMessageHold(messageId: string | undefined, holdMs: number): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (messageId === undefined) return;
    setActive(true);
    const timer = setTimeout(() => setActive(false), holdMs);
    return () => clearTimeout(timer);
  }, [messageId, holdMs]);

  return active;
}
