"use client";

import { useEffect, useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { GlowFilter } from "pixi-filters";
import type { EdgeStatus, NodeStatus, NodeType, Severity, TelemetrySnapshot } from "@/lib/schemas/telemetry";

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

const EDGE_COLOR: Record<EdgeStatus, number> = {
  nominal: 0x1a4d3a,
  congested: 0xaa6600,
  severed: 0xaa1122,
};

interface SceneRefs {
  viewport: Viewport;
  nodeGraphics: Map<string, Graphics>;
  edgeGraphics: Map<string, Graphics>;
  glowFilters: Map<string, GlowFilter>;
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

  const scene: SceneRefs = { viewport, nodeGraphics: new Map(), edgeGraphics: new Map(), glowFilters: new Map() };

  // One shared phase drives every active glow in lockstep, cheap
  // regardless of how many nodes are currently alarmed.
  app.ticker.add(() => {
    if (scene.glowFilters.size === 0) return;
    const phase = (performance.now() % GLOW_PULSE_PERIOD_MS) / GLOW_PULSE_PERIOD_MS;
    const strength = GLOW_PULSE_MIN + ((Math.sin(phase * Math.PI * 2) + 1) / 2) * (GLOW_PULSE_MAX - GLOW_PULSE_MIN);
    for (const filter of scene.glowFilters.values()) {
      filter.outerStrength = strength;
    }
  });

  return scene;
}

// Updates the persistent scene in place, never rebuilds the viewport, the
// backend streams a new snapshot every tick, rebuilding would reset the
// user's pan and zoom position every couple of seconds.
function syncScene(scene: SceneRefs, snapshot: TelemetrySnapshot): void {
  const { viewport, nodeGraphics, edgeGraphics, glowFilters } = scene;
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
    graphic.clear();
    if (from && to) {
      graphic.moveTo(from.position.x, from.position.y).lineTo(to.position.x, to.position.y);
      graphic.stroke({ width: 2, color: EDGE_COLOR[edge.status] });
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
