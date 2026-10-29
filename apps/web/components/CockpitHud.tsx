import type { Severity, TelemetrySnapshot } from "@/lib/schemas/telemetry";

const HEALTH_COLOR: Record<"nominal" | "degraded" | "critical", string> = {
  nominal: "#39ff88",
  degraded: "#ffaa33",
  critical: "#ff3344",
};

const FAULT_SEVERITY_COLOR: Record<Severity, string> = {
  p1: "#ff3344",
  p2: "#ffaa33",
  p3: "#fbca04",
};

function stationHealth(nodes: TelemetrySnapshot["nodes"]): { level: "nominal" | "degraded" | "critical"; percent: number } {
  if (nodes.length === 0) return { level: "nominal", percent: 100 };
  const nominalCount = nodes.filter((node) => node.status === "nominal").length;
  const hasCritical = nodes.some((node) => node.status === "critical" || node.status === "offline");
  const hasDegraded = nodes.some((node) => node.status === "degraded");
  const level = hasCritical ? "critical" : hasDegraded ? "degraded" : "nominal";
  return { level, percent: Math.round((nominalCount / nodes.length) * 100) };
}

function worstFaultSeverity(faults: TelemetrySnapshot["activeFaults"]): Severity | null {
  const active = faults ?? [];
  if (active.some((fault) => fault.severity === "p1")) return "p1";
  if (active.some((fault) => fault.severity === "p2")) return "p2";
  if (active.length > 0) return "p3";
  return null;
}

interface CockpitHudProps {
  snapshot: TelemetrySnapshot | null;
}

// A cockpit instrument, not a stats widget: three readouts in one bordered
// strip, divided like gauges on a single panel rather than separate cards,
// an odometer-style zero-padded tick counter, and a segmented bar for
// health instead of a bare percentage.
export function CockpitHud({ snapshot }: CockpitHudProps) {
  const tick = snapshot ? String(snapshot.tick).padStart(5, "0") : "-----";
  const faultCount = snapshot?.activeFaults?.length ?? 0;
  const worstSeverity = snapshot ? worstFaultSeverity(snapshot.activeFaults) : null;
  const faultColor = worstSeverity ? FAULT_SEVERITY_COLOR[worstSeverity] : "#5a6060";
  const health = snapshot ? stationHealth(snapshot.nodes) : { level: "nominal" as const, percent: 100 };
  const healthColor = HEALTH_COLOR[health.level];
  const filledSegments = Math.round((health.percent / 100) * 10);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex border border-[var(--chrome-border)] bg-[var(--chrome-bg)] font-mono text-[var(--chrome-text-primary)]">
      <div className="border-r border-[var(--chrome-border)] px-4 py-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--chrome-text-secondary)]">Tick</p>
        <p className="mt-1 text-lg tabular-nums tracking-wider text-emerald-400">{tick}</p>
      </div>
      <div className="border-r border-[var(--chrome-border)] px-4 py-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--chrome-text-secondary)]">Active Faults</p>
        <p className="mt-1 text-lg tabular-nums tracking-wider" style={{ color: faultColor }}>
          {String(faultCount).padStart(2, "0")}
        </p>
      </div>
      <div className="px-4 py-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--chrome-text-secondary)]">Station Health</p>
        <p className="mt-1 text-lg uppercase tracking-wider" style={{ color: healthColor }}>
          {health.level}
        </p>
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="h-1.5 w-2"
              style={{ backgroundColor: i < filledSegments ? healthColor : "var(--chrome-border)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
