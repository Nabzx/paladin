"use client";

import { useEffect, useRef } from "react";
import { Application } from "@pixi/react";
import type { Application as PixiApplication, Texture } from "pixi.js";
import { Sprite } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { buildFloorPlan } from "@/lib/floorplan/buildFloorPlan";
import type { FloorPlan, TilePosition } from "@/lib/floorplan/buildFloorPlan";
import { createTileViewport, TILE_SIZE } from "@/lib/floorplan/tileCamera";
import { bakeAlarmNodeTexture, bakeNodeTextures } from "@/lib/sprites/nodeSprites";
import { bakeCorridorTextures } from "@/lib/sprites/corridorSprites";
import { bakeAgentTextures } from "@/lib/sprites/agentSprites";
import { corridorPolyline, FLOW_SPEED_SCALE, pointAtDistance, polylineLength } from "@/lib/sprites/corridorFlow";
import type { Point } from "@/lib/sprites/corridorFlow";
import { startAgentWalk, targetNodeIdFromMessage, WALK_MS_PER_TILE } from "@/lib/sprites/agentMovement";
import type { AgentWalk } from "@/lib/sprites/agentMovement";
import { ALARM_BLINK_PERIOD_MS, ALARM_STATUSES, alarmColorForNode } from "@/lib/sprites/alarm";
import type { AgentId, AgentMessage } from "@/lib/schemas/agent-protocol";
import type { TelemetrySnapshot } from "@/lib/schemas/telemetry";

const BAKED_SIZE = 16 * 4; // CELL_PX (bakeSprite.ts) * 16 cells
const AGENT_IDS: AgentId[] = ["orion", "vulcan", "tesla", "mercury", "athena"];
const AGENT_WALK_SPEED = TILE_SIZE / WALK_MS_PER_TILE; // px/ms

// A fixed "standby" row above the floor plan, evenly spaced: #112's
// recommendation for an agent not currently walking anywhere.
function standbyTiles(floorPlan: FloorPlan): TilePosition[] {
  const roomTiles = [...floorPlan.rooms.values()];
  const minX = Math.min(...roomTiles.map((t) => t.x));
  const maxX = Math.max(...roomTiles.map((t) => t.x));
  const minY = Math.min(...roomTiles.map((t) => t.y));
  const y = minY - 2;
  const span = maxX - minX;
  return AGENT_IDS.map((_, i) => ({ x: minX + Math.round((span * i) / (AGENT_IDS.length - 1)), y }));
}

interface AgentState {
  sprite: Sprite;
  tile: TilePosition;
  walk: AgentWalk | null;
}

function drawAgentSprites(
  app: PixiApplication,
  viewport: Viewport,
  floorPlan: FloorPlan,
  tileToWorld: (tile: TilePosition) => Point,
): Map<AgentId, AgentState> {
  const textures = bakeAgentTextures(app);
  const tiles = standbyTiles(floorPlan);
  const agents = new Map<AgentId, AgentState>();

  AGENT_IDS.forEach((id, i) => {
    const tile = tiles[i];
    const { x, y } = tileToWorld(tile);
    const sprite = new Sprite(textures[id]);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(TILE_SIZE / BAKED_SIZE);
    viewport.addChild(sprite);
    agents.set(id, { sprite, tile, walk: null });
  });

  return agents;
}

interface AlarmSprite {
  sprite: Sprite;
  normal: Texture;
  alarm: Texture;
}

// A palette swap, not GlowFilter (#113's confirmed research: a flat
// tint/filter bleeds through a detailed sprite's internal gaps, 318
// distinct colours against a swap's exact 6). The alarm sprite's own
// blink is driven by the shared ticker below, not per-node timers.
function drawRoomSprites(
  app: PixiApplication,
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  floorPlan: FloorPlan,
  tileToWorld: (tile: TilePosition) => Point,
): AlarmSprite[] {
  const textures = bakeNodeTextures(app);
  const alarms: AlarmSprite[] = [];

  for (const node of snapshot.nodes) {
    const tile = floorPlan.rooms.get(node.id);
    if (!tile) continue;
    const { x, y } = tileToWorld(tile);

    const normal = textures[node.type];
    const sprite = new Sprite(normal);
    sprite.anchor.set(0.5);
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(TILE_SIZE / BAKED_SIZE);
    viewport.addChild(sprite);

    if (ALARM_STATUSES.has(node.status)) {
      const color = alarmColorForNode(node.id, node.status, snapshot.activeFaults);
      const alarm = bakeAlarmNodeTexture(app, node.type, color);
      alarms.push({ sprite, normal, alarm });
    }
  }

  return alarms;
}

interface FlowPulse {
  edgeId: string;
  sprite: Sprite;
  polyline: Point[];
  length: number;
  speed: number;
  phase: number;
}

// Draws the static pipe tiles for every corridor (severed edges get the
// broken variant, #52's rule: nothing flows through a line that can't
// carry it), and sets up one travelling pulse sprite per animated edge.
function drawCorridors(
  app: PixiApplication,
  viewport: Viewport,
  snapshot: TelemetrySnapshot,
  floorPlan: FloorPlan,
  tileToWorld: (tile: TilePosition) => Point,
): FlowPulse[] {
  const textures = bakeCorridorTextures(app);
  const pulses: FlowPulse[] = [];

  for (const edge of snapshot.edges) {
    const path = floorPlan.corridors.get(edge.id);
    const fromTile = floorPlan.rooms.get(edge.from);
    if (!path || !fromTile) continue;

    const severed = edge.status === "severed";
    const texture = severed ? textures.severed : textures.pipe[edge.type];

    for (const tile of path) {
      const { x, y } = tileToWorld(tile);
      const pipe = new Sprite(texture);
      pipe.anchor.set(0.5);
      pipe.x = x;
      pipe.y = y;
      pipe.scale.set(TILE_SIZE / BAKED_SIZE);
      viewport.addChildAt(pipe, 0);
    }

    if (severed) continue;

    const polyline = corridorPolyline(fromTile, path, tileToWorld);
    const length = polylineLength(polyline);
    if (length === 0) continue;

    const pulse = new Sprite(textures.pipe[edge.type]);
    pulse.anchor.set(0.5);
    pulse.scale.set((TILE_SIZE / BAKED_SIZE) * 0.4);
    viewport.addChild(pulse);

    pulses.push({
      edgeId: edge.id,
      sprite: pulse,
      polyline,
      length,
      speed: (edge.currentFlow ?? 0) * FLOW_SPEED_SCALE[edge.type],
      phase: 0,
    });
  }

  return pulses;
}

interface SceneRefs {
  floorPlan: FloorPlan;
  tileToWorld: (tile: TilePosition) => Point;
  agents: Map<AgentId, AgentState>;
}

// A status_broadcast or fix_proposal naming a node sends that message's
// sender walking there, #112's recommendation, reusing the agent-
// protocol stream already driving the Operations Deck (#86), not new
// backend work.
function handleAgentMessage(scene: SceneRefs, message: AgentMessage): void {
  const nodeId = targetNodeIdFromMessage(message);
  if (!nodeId) return;
  const agent = scene.agents.get(message.from);
  const targetTile = scene.floorPlan.rooms.get(nodeId);
  if (!agent || !targetTile) return;

  const walk = startAgentWalk(scene.floorPlan, agent.tile, targetTile, scene.tileToWorld);
  if (walk) agent.walk = walk;
}

interface TileConsoleProps {
  snapshot: TelemetrySnapshot | null;
  messages: AgentMessage[];
}

export function TileConsole({ snapshot, messages }: TileConsoleProps) {
  const sceneRef = useRef<SceneRefs | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || messages.length === 0) return;
    // Every new message, found by set membership rather than "since
    // the last array index": React can batch several socket.onmessage
    // updates into one render (a fault's trace often carries more than
    // one node-naming message, ORION's own status then MERCURY's fix
    // proposal, in the same batch), and useStationSocket's MAX_MESSAGES
    // cap can shift an already-seen id out of the array entirely, which
    // an index-based "last seen" check would mistake for never-seen.
    const seen = seenMessageIdsRef.current;
    for (const message of messages) {
      if (seen.has(message.messageId)) continue;
      seen.add(message.messageId);
      handleAgentMessage(scene, message);
    }
  }, [messages]);

  return (
    <Application
      background="#05080a"
      resizeTo={window}
      onInit={(app: PixiApplication) => {
        if (sceneRef.current || !snapshot) return;
        const floorPlan = buildFloorPlan(snapshot);
        const { viewport, tileToWorld } = createTileViewport(app, floorPlan);
        app.stage.addChild(viewport);
        const alarms = drawRoomSprites(app, viewport, snapshot, floorPlan, tileToWorld);
        const pulses = drawCorridors(app, viewport, snapshot, floorPlan, tileToWorld);
        const agents = drawAgentSprites(app, viewport, floorPlan, tileToWorld);
        sceneRef.current = { floorPlan, tileToWorld, agents };

        app.ticker.add((ticker) => {
          if (alarms.length > 0) {
            const showAlarm = (performance.now() % ALARM_BLINK_PERIOD_MS) / ALARM_BLINK_PERIOD_MS < 0.5;
            for (const alarm of alarms) alarm.sprite.texture = showAlarm ? alarm.alarm : alarm.normal;
          }

          for (const pulse of pulses) {
            pulse.phase = (pulse.phase + pulse.speed * ticker.deltaMS) % pulse.length;
            const point = pointAtDistance(pulse.polyline, pulse.phase);
            pulse.sprite.x = point.x;
            pulse.sprite.y = point.y;
          }

          for (const agent of agents.values()) {
            if (!agent.walk) continue;
            agent.walk.traveled = Math.min(agent.walk.length, agent.walk.traveled + AGENT_WALK_SPEED * ticker.deltaMS);
            const point = pointAtDistance(agent.walk.polyline, agent.walk.traveled);
            agent.sprite.x = point.x;
            agent.sprite.y = point.y;
            if (agent.walk.traveled >= agent.walk.length) {
              agent.tile = agent.walk.targetTile;
              agent.walk = null;
            }
          }
        });
      }}
    />
  );
}
