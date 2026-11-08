import { buildCorridor, tileKey } from "@/lib/floorplan/buildFloorPlan";
import type { FloorPlan, TilePosition } from "@/lib/floorplan/buildFloorPlan";
import { corridorPolyline, polylineLength } from "@/lib/sprites/corridorFlow";
import type { Point } from "@/lib/sprites/corridorFlow";
import type { AgentMessage } from "@/lib/schemas/agent-protocol";

// status_broadcast carries payload.nodeIds (orion.py's _status helper),
// fix_proposal carries payload.targetNodeIds (mercury.py). Only the
// first named node matters, #112's recommendation: an agent only has
// one tile position to walk to, not a queue of them.
export function targetNodeIdFromMessage(message: AgentMessage): string | undefined {
  const payload = message.payload;
  if (message.type === "status_broadcast") {
    const ids = payload.nodeIds;
    if (Array.isArray(ids) && typeof ids[0] === "string") return ids[0];
  } else if (message.type === "fix_proposal") {
    const ids = payload.targetNodeIds;
    if (Array.isArray(ids) && typeof ids[0] === "string") return ids[0];
  }
  return undefined;
}

export interface AgentWalk {
  polyline: Point[];
  length: number;
  traveled: number;
  currentTile: TilePosition;
  targetTile: TilePosition;
}

// Routes an agent from its current tile to a target tile the same way
// a corridor is routed between two rooms (#111's heuristic, falling
// back to real pathfinding), rather than a second, naive pathing
// system that could walk an agent straight through an unrelated room.
export function startAgentWalk(floorPlan: FloorPlan, fromTile: TilePosition, targetTile: TilePosition, tileToWorld: (tile: TilePosition) => Point): AgentWalk | null {
  if (fromTile.x === targetTile.x && fromTile.y === targetTile.y) return null;

  const occupied = new Set(Array.from(floorPlan.rooms.values(), tileKey));
  const path = buildCorridor(fromTile, targetTile, occupied);
  const polyline = corridorPolyline(fromTile, path, tileToWorld);
  const length = polylineLength(polyline);
  if (length === 0) return null;

  return { polyline, length, traveled: 0, currentTile: fromTile, targetTile };
}

// The classic JRPG overworld pace (150-250ms/tile, #112), expressed as
// a speed so a short walk finishes sooner than a long one, genuinely
// proportional rather than a fixed glide regardless of distance, the
// one dramatised-timing effect in this project that isn't reacting to
// a single instantaneous event.
export const WALK_MS_PER_TILE = 200;
