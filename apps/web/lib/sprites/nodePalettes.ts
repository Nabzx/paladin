import type { NodeType } from "@/lib/schemas/telemetry";

// F/P/D/V are shared structural tones (frame, panel body, shading, vent)
// across every node type, so the six sprites read as the same machine
// family. L is the one accent colour that varies, matching the old
// Console's NODE_COLOR per type, so the new pixel-art rendering stays
// semantically continuous with the one it replaces.
const BASE = {
  F: 0x0d1410,
  P: 0x16251c,
  D: 0x0e1813,
  V: 0x0a120e,
};

export const NODE_PALETTE: Record<NodeType, Record<string, number>> = {
  server: { ...BASE, L: 0x39ff88 },
  power_bus: { ...BASE, L: 0xffcc00 },
  thermal_zone: { ...BASE, L: 0x33d6ff },
  transformer: { ...BASE, L: 0xff8844 },
  battery: { ...BASE, L: 0x9d7bff },
  radiator: { ...BASE, L: 0x7fd4ff },
};
