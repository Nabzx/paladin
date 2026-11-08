import type { Application as PixiApplication, Texture } from "pixi.js";
import { bakeSprite } from "@/lib/sprites/bakeSprite";
import {
  BATTERY_GRID,
  POWER_BUS_GRID,
  RADIATOR_GRID,
  SERVER_GRID,
  THERMAL_ZONE_GRID,
  TRANSFORMER_GRID,
} from "@/lib/sprites/nodeGrids";
import { NODE_PALETTE } from "@/lib/sprites/nodePalettes";
import type { NodeType } from "@/lib/schemas/telemetry";

const NODE_GRID: Record<NodeType, string[]> = {
  server: SERVER_GRID,
  power_bus: POWER_BUS_GRID,
  thermal_zone: THERMAL_ZONE_GRID,
  transformer: TRANSFORMER_GRID,
  battery: BATTERY_GRID,
  radiator: RADIATOR_GRID,
};

const NODE_TYPES: NodeType[] = ["server", "power_bus", "thermal_zone", "transformer", "battery", "radiator"];

// Baked once per Application, not per node instance: every server shares
// one SERVER_GRID texture, six sprites total regardless of topology size.
export function bakeNodeTextures(app: PixiApplication): Record<NodeType, Texture> {
  const textures = {} as Record<NodeType, Texture>;
  for (const type of NODE_TYPES) {
    textures[type] = bakeSprite(app, NODE_GRID[type], NODE_PALETTE[type]);
  }
  return textures;
}

// A palette swap, not a filter (#113's confirmed research): the same
// grid, the same structural tones, only the accent (L) cell recoloured
// to the alarm colour, so the alarm reads as "this is now red", not a
// blur bleeding through the sprite's internal detail.
export function bakeAlarmNodeTexture(app: PixiApplication, type: NodeType, color: number): Texture {
  return bakeSprite(app, NODE_GRID[type], { ...NODE_PALETTE[type], L: color });
}
