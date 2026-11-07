"use client";

import { useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics, Sprite } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { buildFloorPlan } from "@/lib/floorplan/buildFloorPlan";
import { createTileViewport, TILE_SIZE } from "@/lib/floorplan/tileCamera";
import { bakeNodeTextures } from "@/lib/sprites/nodeSprites";
import type { NodeStatus, TelemetrySnapshot } from "@/lib/schemas/telemetry";

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

// Corridor placeholders only, real sprites are #118, not this ticket.
function drawCorridorPlaceholders(
  viewport: Viewport,
  floorPlan: ReturnType<typeof buildFloorPlan>,
  tileToWorld: (tile: { x: number; y: number }) => { x: number; y: number },
): void {
  for (const path of floorPlan.corridors.values()) {
    for (const tile of path) {
      const { x, y } = tileToWorld(tile);
      const corridor = new Graphics();
      corridor.rect(x - TILE_SIZE / 4, y - TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2).fill({ color: 0x1a4d3a });
      viewport.addChild(corridor);
    }
  }
}

function drawRoomSprites(
  app: PixiApplication,
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  floorPlan: ReturnType<typeof buildFloorPlan>,
  tileToWorld: (tile: { x: number; y: number }) => { x: number; y: number },
): void {
  const textures = bakeNodeTextures(app);
  const bakedSize = 16 * 4; // CELL_PX (bakeSprite.ts) * 16 cells

  for (const node of snapshot.nodes) {
    const tile = floorPlan.rooms.get(node.id);
    if (!tile) continue;
    const { x, y } = tileToWorld(tile);

    const sprite = new Sprite(textures[node.type]);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(TILE_SIZE / bakedSize);
    sprite.tint = STATUS_TINT[node.status] ?? 0xffffff;
    viewport.addChild(sprite);
  }
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
        drawCorridorPlaceholders(viewport, floorPlan, tileToWorld);
        drawRoomSprites(app, viewport, snapshot, floorPlan, tileToWorld);
      }}
    />
  );
}
