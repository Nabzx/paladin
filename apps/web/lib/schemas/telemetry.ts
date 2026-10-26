// Mirrors docs/schemas/telemetry.schema.json. Hand-written, the schema is
// small enough that a codegen step would be more tooling than the problem
// needs right now.

export type NodeType = "server" | "power_bus" | "thermal_zone" | "transformer" | "battery" | "radiator";
export type NodeStatus = "nominal" | "degraded" | "critical" | "offline";
export type EdgeType = "power_line" | "coolant_line" | "network_link";
export type EdgeStatus = "nominal" | "congested" | "severed";
export type FaultType = "solar_flare" | "micrometeoroid_puncture" | "cooling_breach";
export type Severity = "p1" | "p2" | "p3";

export interface StationNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  status: NodeStatus;
  metrics: {
    powerLoadPercent?: number;
    temperatureCelsius?: number;
    coolantFlowRate?: number;
    batteryChargePercent?: number;
    networkUtilisationPercent?: number;
  };
}

export interface StationEdge {
  id: string;
  type: EdgeType;
  from: string;
  to: string;
  status: EdgeStatus;
  capacity?: number;
  currentFlow?: number;
}

export interface Fault {
  id: string;
  type: FaultType;
  affectedNodeIds: string[];
  affectedEdgeIds?: string[];
  severity: Severity;
}

export interface TelemetrySnapshot {
  tick: number;
  timestamp: string;
  activeFaults?: Fault[];
  nodes: StationNode[];
  edges: StationEdge[];
}

export function isTelemetrySnapshot(data: unknown): data is TelemetrySnapshot {
  return typeof data === "object" && data !== null && "nodes" in data && "edges" in data;
}
