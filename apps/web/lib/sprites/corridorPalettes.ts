import type { EdgeType } from "@/lib/schemas/telemetry";

const BASE = {
  F: 0x0d1410,
  P: 0x16251c,
  D: 0x0e1813,
};

// One accent per edge type, carried over from the old Console's
// EDGE_TYPE_COLOR so the new pixel-art corridors stay recognisable
// against the rendering they replace.
export const CORRIDOR_PALETTE: Record<EdgeType, Record<string, number>> = {
  power_line: { ...BASE, L: 0xffcc00 },
  coolant_line: { ...BASE, L: 0x33d6ff },
  network_link: { ...BASE, L: 0xb388ff },
};

export const SEVERED_PALETTE: Record<string, number> = { ...BASE };
