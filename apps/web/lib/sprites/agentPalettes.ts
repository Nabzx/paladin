import type { AgentId } from "@/lib/schemas/agent-protocol";

const BASE = {
  F: 0x0d1410,
  H: 0x3a4048,
  S: 0x1a2420,
  L: 0x0a120e,
};

// V (visor + chest badge) is each agent's existing identity accent
// colour, lifted straight from OpsDeck.tsx's AGENTS table (ADR-0005),
// so the pixel-art character and its Operations Deck card read as the
// same identity. ATHENA has no fixed card colour (it swaps between
// pass/fail/checking), so its idle accent here is ATHENA_IDLE, the
// same resting colour the card itself defaults to.
export const AGENT_PALETTE: Record<AgentId, Record<string, number>> = {
  orion: { ...BASE, V: 0x39ff88 },
  vulcan: { ...BASE, V: 0x33d6ff },
  tesla: { ...BASE, V: 0xffcc00 },
  mercury: { ...BASE, V: 0x9d6bff },
  athena: { ...BASE, V: 0x8fa3b3 },
};
