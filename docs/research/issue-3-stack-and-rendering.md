# Issue #3: Stack and rendering engine for the tactical console

## Question

What should render PALADIN-Station's pannable, zoomable 2D tactical grid, and what should the backend be, so the brief's "beautifully rendered, interactive" bar is actually reachable rather than merely declared?

## Frontend rendering options considered

| Option | Pan/zoom | Visual ceiling (glow, alarm states) | Node-count headroom | Fit for this project |
|---|---|---|---|---|
| SVG + D3 | `d3-zoom`, mature | CSS filters only, limited glow/bloom | Degrades past a few hundred DOM nodes | Easy, but visually flat for a sci-fi HUD |
| Canvas 2D (hand-rolled) | Manual, more code | Full control, but every effect hand-written | Good | High effort for the payoff |
| Konva (canvas scene graph) | Built in | Moderate, filters are CPU-bound | Good | Fine, but a weaker effects pipeline than WebGL |
| PixiJS (WebGL) | `pixi-viewport` handles it | Shader-based glow, bloom, flicker, all GPU-side | High | Built for exactly this: a game-like, GPU-accelerated 2D scene |

PixiJS is the only option built for the actual bar set in the brief: "beautifully rendered... retro sci-fi space strategy game." Its filter pipeline makes alarm glows and flicker cheap, and `pixi-viewport` solves pan, zoom, and drag as a solved problem rather than something to hand-roll.

## Backend options considered

| Option | Graph/physics math | WebSocket | SMT path (ATHENA) | Fit |
|---|---|---|---|---|
| FastAPI (Python) | networkx, numpy, native | Native, async | Z3's first-class language is Python | Strong |
| Node.js/Express | Possible, weaker ecosystem | Native | Z3 bindings exist but are second-class | Keeps one language, loses the ecosystem the brief leans on |
| Django + Channels | Possible | Needs Channels | Same as FastAPI | Heavier than needed, ORM-centric |

FastAPI wins on the thing that actually matters here: the physics, routing, and future SMT work all live in Python's scientific and formal-methods ecosystem. Taking on a second language for the backend would trade that away for no real benefit at this scale.

## Recommendation

- **Frontend**: Next.js (App Router, TypeScript) and Tailwind for the surrounding chrome (Ops Deck panels, HUD, alarm banners). The Tactical Console itself renders with **PixiJS** via `@pixi/react`, camera handled by **pixi-viewport**.
- **Backend**: **FastAPI** on Python 3.12. **networkx** for the station graph and routing math, **numpy** for the thermal and electrical vector math. A single `asyncio` background task drives the fixed-timestep simulation tick, no separate worker or queue at this scale.
- **Transport**: a single WebSocket connection streaming JSON conforming to `docs/schemas/telemetry.schema.json` and `docs/schemas/agent-protocol.schema.json`. These schemas stay the one source of truth: Pydantic models on the backend, generated TypeScript types on the frontend.
- **No monorepo tooling.** Two apps, two package managers (`npm` for `apps/web`, a `pyproject.toml` for `apps/sim`), a root note on how to run both. Turborepo or Nx would be solving a problem this project doesn't have yet.
- **No database, no message queue.** State lives in memory in the `apps/sim` process for a single demo session. Worth flagging as a deliberate non-goal, not an oversight, if persistence or multi-session support ever comes up.

This confirms the working architecture in `docs/architecture/ARCHITECTURE.md` rather than replacing it, and pins the specific libraries that were left open.

## Verdict

Confirmed. Promoted to [ADR-0001](../adr/0001-stack-and-rendering.md).
