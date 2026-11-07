import { Viewport } from "pixi-viewport";
import type { Application as PixiApplication } from "pixi.js";
import type { FloorPlan, TilePosition } from "@/lib/floorplan/buildFloorPlan";

// Pixel footprint of one tile. Large enough for a hand-authored 16x16
// sprite (see #110) to read clearly at a comfortable default zoom,
// without the viewport needing to start pre-zoomed in.
export const TILE_SIZE = 64;

// All tiles the floor plan actually occupies, rooms and corridors alike,
// so the camera's world bounds are derived from real content rather than
// a guessed constant that could clip a future, larger topology.
function allTiles(floorPlan: FloorPlan): TilePosition[] {
  const tiles: TilePosition[] = [...floorPlan.rooms.values()];
  for (const path of floorPlan.corridors.values()) tiles.push(...path);
  return tiles;
}

const WORLD_PADDING_TILES = 3;

export interface TileCamera {
  viewport: Viewport;
  // Tile coordinates can be negative (a node left/above the sample
  // topology's origin), but a viewport's world content conventionally
  // starts at (0, 0), so every conversion from tile space to world
  // pixels goes through this, not a bare tile*TILE_SIZE multiply.
  tileToWorld: (tile: TilePosition) => { x: number; y: number };
}

export function createTileViewport(app: PixiApplication, floorPlan: FloorPlan): TileCamera {
  const tiles = allTiles(floorPlan);
  const minX = Math.min(...tiles.map((t) => t.x)) - WORLD_PADDING_TILES;
  const maxX = Math.max(...tiles.map((t) => t.x)) + WORLD_PADDING_TILES;
  const minY = Math.min(...tiles.map((t) => t.y)) - WORLD_PADDING_TILES;
  const maxY = Math.max(...tiles.map((t) => t.y)) + WORLD_PADDING_TILES;

  const worldWidth = (maxX - minX) * TILE_SIZE;
  const worldHeight = (maxY - minY) * TILE_SIZE;

  const viewport = new Viewport({
    screenWidth: app.renderer.width,
    screenHeight: app.renderer.height,
    worldWidth,
    worldHeight,
    events: app.renderer.events,
  });

  viewport
    .drag()
    .pinch()
    .wheel()
    .decelerate()
    .clampZoom({ minScale: 0.5, maxScale: 3 })
    .clamp({ direction: "all" });

  viewport.moveCenter(worldWidth / 2, worldHeight / 2);

  const tileToWorld = (tile: TilePosition): { x: number; y: number } => ({
    x: (tile.x - minX) * TILE_SIZE,
    y: (tile.y - minY) * TILE_SIZE,
  });

  return { viewport, tileToWorld };
}
