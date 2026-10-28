import type { AgentId } from "@/lib/schemas/agent-protocol";

// Schematic mission-patch glyphs, not portraits: each one is a drawing of
// what the agent actually does (a targeting reticle for command, a gauge
// for thermal, a bolt for electrical, a routed path for network, a gate
// for verification), in the same thin-stroke, sharp-angle language as the
// rest of the console's HUD. currentColor so each glyph inherits
// AgentCard's existing lit/dim/pulseOverride colour logic, no colour
// decisions of its own.
const STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function OrionAvatar() {
  // A targeting reticle: ORION orchestrates where the other four act.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE_PROPS}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <line x1="12" y1="1.5" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22.5" />
      <line x1="1.5" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22.5" y2="12" />
    </svg>
  );
}

function VulcanAvatar() {
  // A thermometer: a scale tick and a bulb, read literally as a gauge.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE_PROPS}>
      <line x1="12" y1="3" x2="12" y2="14" />
      <line x1="8.5" y1="6" x2="12" y2="6" />
      <line x1="8.5" y1="9.5" x2="12" y2="9.5" />
      <circle cx="12" cy="17.5" r="3.8" />
    </svg>
  );
}

function TeslaAvatar() {
  // A bolt, the most literal of the five, electrical needs no translation.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE_PROPS}>
      <path d="M13 2 L5.5 13 H10 L9 22 L18.5 10 H14 Z" strokeLinejoin="miter" />
    </svg>
  );
}

function MercuryAvatar() {
  // A routed path between three nodes, one leg dashed, the exact dash
  // language #52/#53 already use for network_link edges on the console.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE_PROPS}>
      <line x1="6" y1="18" x2="12" y2="6" />
      <line x1="12" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="18" strokeDasharray="2.2 2.2" />
      <circle cx="6" cy="18" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AthenaAvatar() {
  // A gate: a shield outline split by a crossbar, verification as a
  // checkpoint something passes through, not a soft "trust" emblem.
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...STROKE_PROPS}>
      <path d="M12 2 L20 5 V11 C20 16 16.5 20 12 22 C7.5 20 4 16 4 11 V5 Z" />
      <line x1="4.6" y1="12" x2="19.4" y2="12" />
    </svg>
  );
}

const AVATARS: Record<AgentId, () => React.JSX.Element> = {
  orion: OrionAvatar,
  vulcan: VulcanAvatar,
  tesla: TeslaAvatar,
  mercury: MercuryAvatar,
  athena: AthenaAvatar,
};

export function Avatar({ agentId }: { agentId: AgentId }) {
  const Glyph = AVATARS[agentId];
  return <Glyph />;
}
