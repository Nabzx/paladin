import type { TilePosition } from "@/lib/floorplan/buildFloorPlan";
import type { EdgeType } from "@/lib/schemas/telemetry";

export interface Point {
  x: number;
  y: number;
}

// The corridor path from buildFloorPlan starts one step past the source
// room's own tile (never includes it) and ends exactly at the
// destination room's tile, so prepending the source tile gives the full
// source-to-destination polyline the flow pulse travels along.
export function corridorPolyline(
  fromRoomTile: TilePosition,
  path: TilePosition[],
  tileToWorld: (tile: TilePosition) => Point,
): Point[] {
  return [tileToWorld(fromRoomTile), ...path.map(tileToWorld)];
}

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

// Walks the polyline to find the point at `distance` along it, source
// end first, same direction the path array is already ordered in.
export function pointAtDistance(points: Point[], distance: number): Point {
  let remaining = distance;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLength = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segLength || i === points.length - 1) {
      const t = segLength === 0 ? 0 : Math.min(1, remaining / segLength);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLength;
  }
  return points[points.length - 1];
}

// Carried over from the old Console's DASH_PATTERN speedScale, same
// reasoning: currentFlow's magnitude differs hugely by type (power
// 5-40, coolant uniformly 5, network uniformly 100), one shared scale
// would make network blur past and coolant look nearly static.
export const FLOW_SPEED_SCALE: Record<EdgeType, number> = {
  power_line: 0.0015,
  coolant_line: 0.006,
  network_link: 0.0005,
};
