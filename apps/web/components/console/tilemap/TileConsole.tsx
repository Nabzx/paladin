"use client";

import { useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication } from "pixi.js";
import { Graphics } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { buildFloorPlan } from "@/lib/floorplan/buildFloorPlan";
import { createTileViewport, TILE_SIZE } from "@/lib/floorplan/tileCamera";
import type { TelemetrySnapshot } from "@/lib/schemas/telemetry";

// Placeholder room/corridor markers only, proving the camera's pan/zoom
// works over real tile-grid bounds. Real per-type sprites are #117
// (rooms) and #118 (corridors), not this ticket's scope.
function drawPlaceholders(
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  tileToWorld: (tile: { x: number; y: number }) => { x: number; y: number },
): void {
  const floorPlan = buildFloorPlan(snapshot);

  for (const path of floorPlan.corridors.values()) {
    for (const tile of path) {
      const { x, y } = tileToWorld(tile);
      const corridor = new Graphics();
      corridor.rect(x - TILE_SIZE / 4, y - TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2).fill({ color: 0x1a4d3a });
      viewport.addChild(corridor);
    }
  }

  for (const tile of floorPlan.rooms.values()) {
    const { x, y } = tileToWorld(tile);
    const room = new Graphics();
    room.rect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE).fill({ color: 0x39ff88 });
    viewport.addChild(room);
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
        drawPlaceholders(viewport, snapshot, tileToWorld);
      }}
    />
  );
}
