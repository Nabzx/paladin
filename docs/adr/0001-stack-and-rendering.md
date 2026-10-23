# 0001: Stack and rendering engine

## Status

Accepted

## Context

Ticket #3 needed to settle what renders PALADIN-Station's tactical console and what backend drives it. See `docs/research/issue-3-stack-and-rendering.md` for the full comparison.

## Decision

- Frontend: Next.js, TypeScript, and Tailwind, with PixiJS (via `@pixi/react`) and `pixi-viewport` rendering the Tactical Console.
- Backend: FastAPI on Python 3.12, with networkx and numpy for graph and physics math, driven by an `asyncio` fixed-timestep tick.
- Transport: one WebSocket connection, JSON payloads conforming to `docs/schemas/telemetry.schema.json` and `docs/schemas/agent-protocol.schema.json`.
- No monorepo tooling, no database, no message queue, at this scale.

## Consequences

- Unlocks #7 (scaffold) and #8 (prototype), both of which were blocked on this decision.
- Commits the project to a GPU-accelerated 2D render path. Effects like alarm glow and flicker become cheap. If PixiJS proves awkward, SVG filters are not a quick fallback, that would need a follow-up ADR.
- ATHENA's eventual Z3 integration stays a pure Python addition, no cross-language bridge required.
- `docs/schemas/*.schema.json` is now load-bearing: a change there has to be reflected in both the Pydantic models and the generated TypeScript types.
