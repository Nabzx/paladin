import { useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics, Text, TextStyle } from "pixi.js";
import { Viewport } from "pixi-viewport";

type NodeType = "server" | "power_bus" | "thermal_zone";

interface StationNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
}

interface StationEdge {
  from: string;
  to: string;
}

// Static stand-in for a telemetry.schema.json snapshot. No live data,
// no agents, just enough shape to prove the render and camera hold up.
const NODES: StationNode[] = [
  { id: "BUS-A", type: "power_bus", x: 200, y: 300 },
  { id: "SRV-01", type: "server", x: 400, y: 180 },
  { id: "SRV-02", type: "server", x: 400, y: 300 },
  { id: "SRV-03", type: "server", x: 400, y: 420 },
  { id: "THERM-N", type: "thermal_zone", x: 620, y: 240 },
  { id: "THERM-S", type: "thermal_zone", x: 620, y: 360 },
  { id: "BUS-B", type: "power_bus", x: 800, y: 300 },
];

const EDGES: StationEdge[] = [
  { from: "BUS-A", to: "SRV-01" },
  { from: "BUS-A", to: "SRV-02" },
  { from: "BUS-A", to: "SRV-03" },
  { from: "SRV-01", to: "THERM-N" },
  { from: "SRV-02", to: "THERM-N" },
  { from: "SRV-03", to: "THERM-S" },
  { from: "THERM-N", to: "BUS-B" },
  { from: "THERM-S", to: "BUS-B" },
];

const NODE_COLOR: Record<NodeType, number> = {
  server: 0x39ff88,
  power_bus: 0xffcc00,
  thermal_zone: 0x33d6ff,
};

function buildScene(app: PixiApplication) {
  const viewport = new Viewport({
    screenWidth: app.renderer.width,
    screenHeight: app.renderer.height,
    worldWidth: 1000,
    worldHeight: 600,
    events: app.renderer.events,
  });
  app.stage.addChild(viewport);
  viewport.drag().pinch().wheel().decelerate();

  const byId = new Map(NODES.map((node) => [node.id, node]));

  const edgeLayer = new Graphics();
  for (const edge of EDGES) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;
    edgeLayer.moveTo(from.x, from.y).lineTo(to.x, to.y);
  }
  edgeLayer.stroke({ width: 2, color: 0x1a4d3a });
  viewport.addChild(edgeLayer);

  for (const node of NODES) {
    const marker = new Graphics();
    marker.circle(0, 0, 18).fill(NODE_COLOR[node.type]);
    marker.circle(0, 0, 26).stroke({ width: 2, color: NODE_COLOR[node.type], alpha: 0.35 });
    marker.x = node.x;
    marker.y = node.y;
    viewport.addChild(marker);

    const label = new Text({
      text: node.id,
      style: new TextStyle({ fill: 0xe6fff2, fontFamily: "monospace", fontSize: 11 }),
    });
    label.anchor.set(0.5, 1.6);
    label.x = node.x;
    label.y = node.y;
    viewport.addChild(label);
  }

  viewport.moveCenter(500, 300);
}

export default function App() {
  const built = useRef(false);

  return (
    <Application
      background="#05080a"
      resizeTo={window}
      onInit={(app) => {
        if (built.current) return;
        built.current = true;
        buildScene(app);
      }}
    />
  );
}
