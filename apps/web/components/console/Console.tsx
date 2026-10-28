"use client";

import { useEffect, useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import type { EdgeStatus, EdgeType, NodeStatus, NodeType, Severity, TelemetrySnapshot } from "@/lib/schemas/telemetry";

const NODE_COLOR: Record<NodeType, number> = {
  server: 0x39ff88,
  power_bus: 0xffcc00,
  thermal_zone: 0x33d6ff,
  transformer: 0xff8844,
  battery: 0x9d7bff,
  radiator: 0x7fd4ff,
};

// Overrides NODE_COLOR when present, also drives the alarm glow's colour.
const STATUS_TINT: Partial<Record<NodeStatus, number>> = {
  critical: 0xff3344,
  degraded: 0xffaa33,
};

const ALARM_STATUSES = new Set<NodeStatus>(["degraded", "critical"]);

// Lifted directly from the p1/p2/p3 GitHub label colours, so the console's
// severity language matches the project's own issue-tracking severity
// language.
const SEVERITY_COLOR: Record<Severity, number> = {
  p1: 0xb60205,
  p2: 0xd93f0b,
  p3: 0xfbca04,
};

// Most recent matching fault wins, a node can be hit more than once.
function glowColorForNode(nodeId: string, status: NodeStatus, activeFaults: TelemetrySnapshot["activeFaults"]): number {
  const faults = activeFaults ?? [];
  for (let i = faults.length - 1; i >= 0; i -= 1) {
    if (faults[i].affectedNodeIds.includes(nodeId)) return SEVERITY_COLOR[faults[i].severity];
  }
  return STATUS_TINT[status] ?? SEVERITY_COLOR.p3;
}
const GLOW_PULSE_MIN = 1.5;
const GLOW_PULSE_MAX = 4.5;
const GLOW_PULSE_PERIOD_MS = 900;

// Status overrides EDGE_TYPE_COLOR's nominal-case colour, something wrong
// matters more than what kind of line it is.
const EDGE_COLOR: Partial<Record<EdgeStatus, number>> = {
  congested: 0xaa6600,
  severed: 0xaa1122,
};

// Distinct base colour per type for the nominal case, so the three kinds
// are distinguishable at a glance without reading a legend.
const EDGE_TYPE_COLOR: Record<EdgeType, number> = {
  power_line: 0x1a4d3a,
  coolant_line: 0x1a7a9a,
  network_link: 0x6a3d9a,
};

// A distinct dash pattern per type, same reasoning as the colour above.
// currentFlow is static (set once at topology build, #11), not a live
// per-tick value, so speedScale is a relative scale against a typical
// edge's flow for that type, not a calibrated physical unit, the three
// types have very different flow magnitudes in the sample topology
// (power 5-40, coolant uniformly 5, network uniformly 100), one shared
// scale would make network blur past and coolant look nearly static.
const DASH_PATTERN: Record<EdgeType, { length: number; gap: number; speedScale: number }> = {
  power_line: { length: 8, gap: 6, speedScale: 0.0015 },
  coolant_line: { length: 3, gap: 4, speedScale: 0.006 },
  network_link: { length: 14, gap: 5, speedScale: 0.0005 },
};

interface EdgeFlow {
  type: EdgeType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: number;
  speed: number;
  phase: number;
}

interface SceneRefs {
  viewport: Viewport;
  nodeGraphics: Map<string, Graphics>;
  edgeGraphics: Map<string, Graphics>;
  glowFilters: Map<string, GlowFilter>;
  edgeFlow: Map<string, EdgeFlow>;
}

function drawDashedLine(graphic: Graphics, flow: EdgeFlow): void {
  graphic.clear();
  const dx = flow.toX - flow.fromX;
  const dy = flow.toY - flow.fromY;
  const totalLength = Math.sqrt(dx * dx + dy * dy);
  if (totalLength === 0) return;
  const ux = dx / totalLength;
  const uy = dy / totalLength;
  const { length: dashLength, gap: dashGap } = DASH_PATTERN[flow.type];
  const cycle = dashLength + dashGap;

  // Shifts the pattern toward "to" as phase grows, flow runs from source
  // to destination (battery toward servers, servers toward radiator).
  // -(phase % cycle) shifts the other way, a bug caught while
  // generalising this for #53, #52 never checked direction, only motion.
  let distance = (flow.phase % cycle) - cycle;
  while (distance < totalLength) {
    const segmentStart = Math.max(distance, 0);
    const segmentEnd = Math.min(distance + dashLength, totalLength);
    if (segmentEnd > segmentStart) {
      graphic.moveTo(flow.fromX + ux * segmentStart, flow.fromY + uy * segmentStart);
      graphic.lineTo(flow.fromX + ux * segmentEnd, flow.fromY + uy * segmentEnd);
    }
    distance += cycle;
  }
  graphic.stroke({ width: 2, color: flow.color });
}

function buildScene(app: PixiApplication): SceneRefs {
  const viewport = new Viewport({
    screenWidth: app.renderer.width,
    screenHeight: app.renderer.height,
    worldWidth: 1000,
    worldHeight: 600,
    events: app.renderer.events,
  });
  app.stage.addChild(viewport);
  viewport.drag().pinch().wheel().decelerate();
  viewport.moveCenter(500, 300);

  const scene: SceneRefs = {
    viewport,
    nodeGraphics: new Map(),
    edgeGraphics: new Map(),
    glowFilters: new Map(),
    edgeFlow: new Map(),
  };

  app.ticker.add((ticker) => {
    // One shared phase drives every active glow in lockstep, cheap
    // regardless of how many nodes are currently alarmed.
    if (scene.glowFilters.size > 0) {
      const phase = (performance.now() % GLOW_PULSE_PERIOD_MS) / GLOW_PULSE_PERIOD_MS;
      const strength = GLOW_PULSE_MIN + ((Math.sin(phase * Math.PI * 2) + 1) / 2) * (GLOW_PULSE_MAX - GLOW_PULSE_MIN);
      for (const filter of scene.glowFilters.values()) {
        filter.outerStrength = strength;
      }
    }

    // Only animated edges redraw per frame, the rest of the scene stays
    // untouched, keeping this cheap regardless of frame rate.
    for (const [edgeId, flow] of scene.edgeFlow) {
      const graphic = scene.edgeGraphics.get(edgeId);
      if (!graphic) continue;
      flow.phase += flow.speed * ticker.deltaMS;
      drawDashedLine(graphic, flow);
    }
  });

  return scene;
}

// Updates the persistent scene in place, never rebuilds the viewport, the
// backend streams a new snapshot every tick, rebuilding would reset the
// user's pan and zoom position every couple of seconds.
function syncScene(scene: SceneRefs, snapshot: TelemetrySnapshot): void {
  const { viewport, nodeGraphics, edgeGraphics, glowFilters, edgeFlow } = scene;
  const seenNodeIds = new Set<string>();
  const seenEdgeIds = new Set<string>();

  for (const edge of snapshot.edges) {
    seenEdgeIds.add(edge.id);
    let graphic = edgeGraphics.get(edge.id);
    if (!graphic) {
      graphic = new Graphics();
      viewport.addChildAt(graphic, 0);
      edgeGraphics.set(edge.id, graphic);
    }

    const from = snapshot.nodes.find((node) => node.id === edge.from);
    const to = snapshot.nodes.find((node) => node.id === edge.to);
    if (!from || !to) {
      graphic.clear();
      continue;
    }

    const color = EDGE_COLOR[edge.status] ?? EDGE_TYPE_COLOR[edge.type];

    // An animated flow for a severed edge would show current, coolant, or
    // traffic still moving through a line that physically can't carry
    // any, so severed edges fall back to the static stroke.
    const animated = edge.status !== "severed";
    if (animated) {
      const existing = edgeFlow.get(edge.id);
      const speed = (edge.currentFlow ?? 0) * DASH_PATTERN[edge.type].speedScale;
      edgeFlow.set(edge.id, {
        type: edge.type,
        fromX: from.position.x,
        fromY: from.position.y,
        toX: to.position.x,
        toY: to.position.y,
        color,
        speed,
        phase: existing?.phase ?? 0,
      });
    } else {
      edgeFlow.delete(edge.id);
      graphic.clear();
      graphic.moveTo(from.position.x, from.position.y).lineTo(to.position.x, to.position.y);
      graphic.stroke({ width: 2, color });
    }
  }

  for (const node of snapshot.nodes) {
    seenNodeIds.add(node.id);
    let graphic = nodeGraphics.get(node.id);
    if (!graphic) {
      graphic = new Graphics();
      graphic.x = node.position.x;
      graphic.y = node.position.y;
      viewport.addChild(graphic);
      nodeGraphics.set(node.id, graphic);

      const label = new Text({
        text: node.id,
        style: new TextStyle({ fill: 0xe6fff2, fontFamily: "monospace", fontSize: 11 }),
      });
      label.anchor.set(0.5, 1.6);
      label.x = node.position.x;
      label.y = node.position.y;
      viewport.addChild(label);
    }

    const color = STATUS_TINT[node.status] ?? NODE_COLOR[node.type];
    graphic.clear();
    graphic.circle(0, 0, 18).fill(color);
    graphic.circle(0, 0, 26).stroke({ width: 2, color, alpha: 0.35 });

    if (ALARM_STATUSES.has(node.status)) {
      let glow = glowFilters.get(node.id);
      if (!glow) {
        glow = new GlowFilter({ distance: 14, outerStrength: GLOW_PULSE_MIN });
        glowFilters.set(node.id, glow);
        graphic.filters = [glow];
      }
      glow.color = glowColorForNode(node.id, node.status, snapshot.activeFaults);
    } else if (glowFilters.has(node.id)) {
      glowFilters.delete(node.id);
      graphic.filters = [];
    }
  }

  for (const [id, graphic] of nodeGraphics) {
    if (!seenNodeIds.has(id)) {
      graphic.destroy();
      nodeGraphics.delete(id);
      glowFilters.delete(id);
    }
  }
  for (const [id, graphic] of edgeGraphics) {
    if (!seenEdgeIds.has(id)) {
      graphic.destroy();
      edgeGraphics.delete(id);
      edgeFlow.delete(id);
    }
  }
}

interface ConsoleProps {
  snapshot: TelemetrySnapshot | null;
}

export function Console({ snapshot }: ConsoleProps) {
  const sceneRef = useRef<SceneRefs | null>(null);

  useEffect(() => {
    if (sceneRef.current && snapshot) {
      syncScene(sceneRef.current, snapshot);
    }
  }, [snapshot]);

  return (
    <Application
      background="#05080a"
      resizeTo={window}
      onInit={(app) => {
        if (sceneRef.current) return;
        sceneRef.current = buildScene(app);
        if (snapshot) syncScene(sceneRef.current, snapshot);
      }}
    />
  );
}
