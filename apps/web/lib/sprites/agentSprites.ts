import type { Application as PixiApplication, Texture } from "pixi.js";
import { bakeSprite } from "@/lib/sprites/bakeSprite";
import { ATHENA_GRID, MERCURY_GRID, ORION_GRID, TESLA_GRID, VULCAN_GRID } from "@/lib/sprites/agentGrids";
import { AGENT_PALETTE } from "@/lib/sprites/agentPalettes";
import type { AgentId } from "@/lib/schemas/agent-protocol";
import type { SpriteGrid } from "@/lib/sprites/nodeGrids";

const AGENT_GRID: Record<AgentId, SpriteGrid> = {
  orion: ORION_GRID,
  vulcan: VULCAN_GRID,
  tesla: TESLA_GRID,
  mercury: MERCURY_GRID,
  athena: ATHENA_GRID,
};

const AGENT_IDS: AgentId[] = ["orion", "vulcan", "tesla", "mercury", "athena"];

// Baked once per Application: one idle-pose texture per agent,
// regardless of how many times that agent's sprite is drawn.
export function bakeAgentTextures(app: PixiApplication): Record<AgentId, Texture> {
  const textures = {} as Record<AgentId, Texture>;
  for (const id of AGENT_IDS) {
    textures[id] = bakeSprite(app, AGENT_GRID[id], AGENT_PALETTE[id]);
  }
  return textures;
}
