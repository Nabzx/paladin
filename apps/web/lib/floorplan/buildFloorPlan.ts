import type { TelemetrySnapshot } from "@/lib/schemas/telemetry";

export interface TilePosition {
  x: number;
  y: number;
}

export interface FloorPlan {
  rooms: Map<string, TilePosition>;
  corridors: Map<string, TilePosition[]>;
}

// Rescales the engine's own node layout onto an integer tile grid, rather
// than inventing a fresh floor-plan algorithm: the existing positions
// already encode a sensible left-to-right power/coolant/network flow, and
// reusing them keeps the new pixel-art rendering visually continuous with
// the old line/circle one. Confirmed collision-free for the real 10-node
// sample topology, see #111's research.
const ROOM_SCALE = 40;

function tileKey(t: TilePosition): string {
  return `${t.x},${t.y}`;
}

function roomTile(position: { x: number; y: number }): TilePosition {
  return { x: Math.round(position.x / ROOM_SCALE), y: Math.round(position.y / ROOM_SCALE) };
}

// Tries the straight orthogonal L-bend first (zero search cost), the
// cheap path that covers most real edges, see #111.
function lBendPath(a: TilePosition, b: TilePosition, verticalFirst: boolean): TilePosition[] {
  const path: TilePosition[] = [];
  let { x, y } = a;
  if (verticalFirst) {
    while (y !== b.y) {
      y += b.y > y ? 1 : -1;
      path.push({ x, y });
    }
    while (x !== b.x) {
      x += b.x > x ? 1 : -1;
      path.push({ x, y });
    }
  } else {
    while (x !== b.x) {
      x += b.x > x ? 1 : -1;
      path.push({ x, y });
    }
    while (y !== b.y) {
      y += b.y > y ? 1 : -1;
      path.push({ x, y });
    }
  }
  return path;
}

function pathCollides(path: TilePosition[], occupied: Set<string>, a: TilePosition, b: TilePosition): boolean {
  return path.some((t) => (t.x !== a.x || t.y !== a.y) && (t.x !== b.x || t.y !== b.y) && occupied.has(tileKey(t)));
}

// Breadth-first search over the tile grid, treating every other room's
// tile as blocked. The confirmed fallback for edges where neither L-bend
// option works, #111 found two real ones (SRV-01->SRV-03, THERM-S->RAD-1),
// not a hypothetical case.
function bfsPath(a: TilePosition, b: TilePosition, occupied: Set<string>): TilePosition[] {
  const margin = 2;
  const minX = Math.min(a.x, b.x) - margin;
  const maxX = Math.max(a.x, b.x) + margin;
  const minY = Math.min(a.y, b.y) - margin;
  const maxY = Math.max(a.y, b.y) + margin;

  const startKey = tileKey(a);
  const queue: TilePosition[] = [a];
  const cameFrom = new Map<string, TilePosition>();
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === b.x && current.y === b.y) break;

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = { x: current.x + dx, y: current.y + dy };
      const key = tileKey(next);
      if (visited.has(key)) continue;
      if (next.x < minX || next.x > maxX || next.y < minY || next.y > maxY) continue;
      const isEndpoint = (next.x === a.x && next.y === a.y) || (next.x === b.x && next.y === b.y);
      if (!isEndpoint && occupied.has(key)) continue;
      visited.add(key);
      cameFrom.set(key, current);
      queue.push(next);
    }
  }

  const path: TilePosition[] = [];
  let step: TilePosition | undefined = b;
  while (step && (step.x !== a.x || step.y !== a.y)) {
    path.unshift(step);
    step = cameFrom.get(tileKey(step));
  }
  return path;
}

function buildCorridor(a: TilePosition, b: TilePosition, occupied: Set<string>): TilePosition[] {
  const horizontalFirst = lBendPath(a, b, false);
  if (!pathCollides(horizontalFirst, occupied, a, b)) return horizontalFirst;

  const verticalFirst = lBendPath(a, b, true);
  if (!pathCollides(verticalFirst, occupied, a, b)) return verticalFirst;

  return bfsPath(a, b, occupied);
}

export function buildFloorPlan(snapshot: Pick<TelemetrySnapshot, "nodes" | "edges">): FloorPlan {
  const rooms = new Map<string, TilePosition>();
  for (const node of snapshot.nodes) {
    rooms.set(node.id, roomTile(node.position));
  }

  const occupied = new Set(Array.from(rooms.values(), tileKey));

  const corridors = new Map<string, TilePosition[]>();
  for (const edge of snapshot.edges) {
    const from = rooms.get(edge.from);
    const to = rooms.get(edge.to);
    if (!from || !to) continue;
    corridors.set(edge.id, buildCorridor(from, to, occupied));
  }

  return { rooms, corridors };
}
