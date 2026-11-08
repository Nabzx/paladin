import type { Application as PixiApplication, Texture } from "pixi.js";
import { bakeSprite } from "@/lib/sprites/bakeSprite";
import { PIPE_GRID, PIPE_SEVERED_GRID } from "@/lib/sprites/corridorGrids";
import { CORRIDOR_PALETTE, SEVERED_PALETTE } from "@/lib/sprites/corridorPalettes";
import type { EdgeType } from "@/lib/schemas/telemetry";

const EDGE_TYPES: EdgeType[] = ["power_line", "coolant_line", "network_link"];

export interface CorridorTextures {
  pipe: Record<EdgeType, Texture>;
  severed: Texture;
}

// Baked once per Application: three pipe textures plus one shared
// severed texture, regardless of how many corridor tiles exist.
export function bakeCorridorTextures(app: PixiApplication): CorridorTextures {
  const pipe = {} as Record<EdgeType, Texture>;
  for (const type of EDGE_TYPES) {
    pipe[type] = bakeSprite(app, PIPE_GRID, CORRIDOR_PALETTE[type]);
  }
  const severed = bakeSprite(app, PIPE_SEVERED_GRID, SEVERED_PALETTE);
  return { pipe, severed };
}
