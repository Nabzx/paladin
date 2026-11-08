import { Viewport } from "pixi-viewport";
import type { Application as PixiApplication } from "pixi.js";
import type { FloorPlan, TilePosition } from "@/lib/floorplan/buildFloorPlan";

interface Point {
  x: number;
  y: number;
}

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

// Ported from Console.tsx's own focusOnNodes/triggerFaultEffects (#63):
// same deliberate glide, same single-node-vs-bounding-box cases, just
// computed over already-converted world points instead of the old
// arbitrary float positions, the caller does the tile->world lookup.
const CAMERA_FOCUS_TIME_MS = 700;
const CAMERA_FOCUS_EASE = "easeInOutSine";
// A single affected node has no bounding box to fit, this is how close
// in to sit on it. Two or more nodes compute their own scale from how
// far apart they are, clamped between these so a pair of adjacent
// tiles doesn't over-zoom and a pair on opposite ends of the floor
// plan doesn't zoom out past comfortable framing.
const SINGLE_NODE_FOCUS_SCALE = 1.8;
const MIN_FOCUS_SCALE = 0.9;
const MAX_FOCUS_SCALE = 1.8;
const FOCUS_PADDING_PX = 220;

export function focusOnPoints(app: PixiApplication, viewport: Viewport, points: Point[]): void {
  if (points.length === 0) return;

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const scale =
    bboxWidth === 0 && bboxHeight === 0
      ? SINGLE_NODE_FOCUS_SCALE
      : Math.max(
          MIN_FOCUS_SCALE,
          Math.min(
            MAX_FOCUS_SCALE,
            Math.min(
              app.renderer.width / (bboxWidth + FOCUS_PADDING_PX),
              app.renderer.height / (bboxHeight + FOCUS_PADDING_PX),
            ),
          ),
        );

  viewport.animate({ position: center, scale, time: CAMERA_FOCUS_TIME_MS, ease: CAMERA_FOCUS_EASE });
}
