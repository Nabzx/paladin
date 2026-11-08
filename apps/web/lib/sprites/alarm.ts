import type { NodeStatus, Severity, TelemetrySnapshot } from "@/lib/schemas/telemetry";

// Lifted directly from Console.tsx's own constants (ADR-0005's colour
// language): this ticket changes the rendering technique (palette
// swap instead of GlowFilter, #113's confirmed research), not the
// underlying severity vocabulary.
export const ALARM_STATUSES = new Set<NodeStatus>(["degraded", "critical"]);

const STATUS_FALLBACK_COLOR: Partial<Record<NodeStatus, number>> = {
  critical: 0xff3344,
  degraded: 0xffaa33,
};

const SEVERITY_COLOR: Record<Severity, number> = {
  p1: 0xb60205,
  p2: 0xd93f0b,
  p3: 0xfbca04,
};

// Most recent matching fault wins, a node can be hit more than once.
// Ported verbatim from Console.tsx's glowColorForNode.
export function alarmColorForNode(nodeId: string, status: NodeStatus, activeFaults: TelemetrySnapshot["activeFaults"]): number {
  const faults = activeFaults ?? [];
  for (let i = faults.length - 1; i >= 0; i -= 1) {
    if (faults[i].affectedNodeIds.includes(nodeId)) return SEVERITY_COLOR[faults[i].severity];
  }
  return STATUS_FALLBACK_COLOR[status] ?? SEVERITY_COLOR.p3;
}

// #113's research measured GlowFilter bleeding a soft halo through
// every internal transparent gap on a detailed sprite (318 distinct
// colours vs a palette swap's exact 6), muddying detail a flat circle
// never had to worry about. A blink between the normal and alarm
// textures is the natural follow-up #113 flagged: most retro games
// blink an alarm state rather than holding it statically.
export const ALARM_BLINK_PERIOD_MS = 700;
