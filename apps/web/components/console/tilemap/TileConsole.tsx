"use client";

import { useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Sprite } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { buildFloorPlan } from "@/lib/floorplan/buildFloorPlan";
import type { TilePosition } from "@/lib/floorplan/buildFloorPlan";
import { createTileViewport, TILE_SIZE } from "@/lib/floorplan/tileCamera";
import { bakeNodeTextures } from "@/lib/sprites/nodeSprites";
import { bakeCorridorTextures } from "@/lib/sprites/corridorSprites";
import { bakeAgentTextures } from "@/lib/sprites/agentSprites";
import { corridorPolyline, FLOW_SPEED_SCALE, pointAtDistance, polylineLength } from "@/lib/sprites/corridorFlow";
import type { AgentId } from "@/lib/schemas/agent-protocol";
import type { NodeStatus, TelemetrySnapshot } from "@/lib/schemas/telemetry";

const BAKED_SIZE = 16 * 4; // CELL_PX (bakeSprite.ts) * 16 cells

const AGENT_IDS: AgentId[] = ["orion", "vulcan", "tesla", "mercury", "athena"];

// A fixed "standby" row above the floor plan, evenly spaced: #112's
// recommendation for an agent not currently walking anywhere.
// Movement between tiles is #120's own ticket, this is just the
// resting position #119's DoD asks for.
function standbyTiles(floorPlan: ReturnType<typeof buildFloorPlan>): TilePosition[] {
  const roomTiles = [...floorPlan.rooms.values()];
  const minX = Math.min(...roomTiles.map((t) => t.x));
  const maxX = Math.max(...roomTiles.map((t) => t.x));
  const minY = Math.min(...roomTiles.map((t) => t.y));
  const y = minY - 2;
  const span = maxX - minX;
  return AGENT_IDS.map((_, i) => ({ x: minX + Math.round((span * i) / (AGENT_IDS.length - 1)), y }));
}

function drawAgentSprites(
  app: PixiApplication,
  viewport: Viewport,
  floorPlan: ReturnType<typeof buildFloorPlan>,
  tileToWorld: (tile: TilePosition) => { x: number; y: number },
): void {
  const textures = bakeAgentTextures(app);
  const tiles = standbyTiles(floorPlan);

  AGENT_IDS.forEach((id, i) => {
    const { x, y } = tileToWorld(tiles[i]);
    const sprite = new Sprite(textures[id]);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(TILE_SIZE / BAKED_SIZE);
    viewport.addChild(sprite);
  });
}

// Multiplicative sprite tints, applied over the baked texture rather
// than a second baked texture: status overriding identity is ADR-0005's
// existing rule, this is that rule expressed via Sprite.tint instead of
// a fill colour. #121 replaces this with the researched palette-swap
// treatment (#113); this is the minimum needed for #117's own DoD,
// status still visibly overrides identity.
const STATUS_TINT: Partial<Record<NodeStatus, number>> = {
  degraded: 0xffaa33,
  critical: 0xff3344,
};

function drawRoomSprites(
  app: PixiApplication,
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  floorPlan: ReturnType<typeof buildFloorPlan>,
  tileToWorld: (tile: { x: number; y: number }) => { x: number; y: number },
): void {
  const textures = bakeNodeTextures(app);

  for (const node of snapshot.nodes) {
    const tile = floorPlan.rooms.get(node.id);
    if (!tile) continue;
    const { x, y } = tileToWorld(tile);

    const sprite = new Sprite(textures[node.type]);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(TILE_SIZE / BAKED_SIZE);
    sprite.tint = STATUS_TINT[node.status] ?? 0xffffff;
    viewport.addChild(sprite);
  }
}

interface FlowPulse {
  edgeId: string;
  sprite: Sprite;
  polyline: { x: number; y: number }[];
  length: number;
  speed: number;
  phase: number;
}

// Draws the static pipe tiles for every corridor (severed edges get the
// broken variant, #52's rule: nothing flows through a line that can't
// carry it), and sets up one travelling pulse sprite per animated edge.
// The pulse's own ticker loop is returned so the caller can start it
// once, rather than rebuilding on every snapshot.
function drawCorridors(
  app: PixiApplication,
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  floorPlan: ReturnType<typeof buildFloorPlan>,
  tileToWorld: (tile: { x: number; y: number }) => { x: number; y: number },
): FlowPulse[] {
  const textures = bakeCorridorTextures(app);
  const pulses: FlowPulse[] = [];

  for (const edge of snapshot.edges) {
    const path = floorPlan.corridors.get(edge.id);
    const fromTile = floorPlan.rooms.get(edge.from);
    if (!path || !fromTile) continue;

    const severed = edge.status === "severed";
    const texture = severed ? textures.severed : textures.pipe[edge.type];

    for (const tile of path) {
      const { x, y } = tileToWorld(tile);
      const pipe = new Sprite(texture);
      pipe.anchor.set(0.5);
      pipe.x = x;
      pipe.y = y;
      pipe.scale.set(TILE_SIZE / BAKED_SIZE);
      viewport.addChildAt(pipe, 0);
    }

    if (severed) continue;

    const polyline = corridorPolyline(fromTile, path, tileToWorld);
    const length = polylineLength(polyline);
    if (length === 0) continue;

    const pulse = new Sprite(textures.pipe[edge.type]);
    pulse.anchor.set(0.5);
    pulse.scale.set((TILE_SIZE / BAKED_SIZE) * 0.4);
    viewport.addChild(pulse);

    pulses.push({
      edgeId: edge.id,
      sprite: pulse,
      polyline,
      length,
      speed: (edge.currentFlow ?? 0) * FLOW_SPEED_SCALE[edge.type],
      phase: 0,
    });
  }

  return pulses;
}

interface TileConsoleProps {
  snapshot: TelemetrySnapshot | null;
}

export function TileConsole({ snapshot }: TileConsoleProps) {
  const builtRef = useRef(false);

  return (
    <Application
      background="#05080a"
      resizeTo={window}
      onInit={(app: PixiApplication) => {
        if (builtRef.current || !snapshot) return;
        builtRef.current = true;
        const floorPlan = buildFloorPlan(snapshot);
        const { viewport, tileToWorld } = createTileViewport(app, floorPlan);
        app.stage.addChild(viewport);
        drawRoomSprites(app, viewport, snapshot, floorPlan, tileToWorld);
        const pulses = drawCorridors(app, viewport, snapshot, floorPlan, tileToWorld);
        drawAgentSprites(app, viewport, floorPlan, tileToWorld);

        app.ticker.add((ticker) => {
          for (const pulse of pulses) {
            pulse.phase = (pulse.phase + pulse.speed * ticker.deltaMS) % pulse.length;
            const point = pointAtDistance(pulse.polyline, pulse.phase);
            pulse.sprite.x = point.x;
            pulse.sprite.y = point.y;
          }
        });
      }}
    />
  );
}
