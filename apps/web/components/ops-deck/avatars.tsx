import type { AgentId } from "@/lib/schemas/agent-protocol";
import {
  ATHENA_PORTRAIT,
  MERCURY_PORTRAIT,
  ORION_PORTRAIT,
  TESLA_PORTRAIT,
  VULCAN_PORTRAIT,
  type PortraitGrid,
} from "./portraitGrids";

const PORTRAIT: Record<AgentId, PortraitGrid> = {
  orion: ORION_PORTRAIT,
  vulcan: VULCAN_PORTRAIT,
  tesla: TESLA_PORTRAIT,
  mercury: MERCURY_PORTRAIT,
  athena: ATHENA_PORTRAIT,
};

const GRID_SIZE = 12;

// A small pixel-art portrait, not a hand-drawn stroke glyph (#60):
// each filled grid cell is one <rect>, fill="currentColor" so it still
// inherits AgentCard's existing lit/dim/pulseOverride colour logic
// (ADR-0005), shapeRendering="crispEdges" so the cells stay sharp
// rather than being anti-aliased into a blur at this small size.
function PixelPortrait({ grid }: { grid: PortraitGrid }) {
  return (
    <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} width="22" height="22" shapeRendering="crispEdges">
      {grid.flatMap((row, y) =>
        [...row].map((cell, x) => (cell === "#" ? <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

export function Avatar({ agentId }: { agentId: AgentId }) {
  return <PixelPortrait grid={PORTRAIT[agentId]} />;
}
