# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial repository scaffolding: conventions, labels, templates, and documentation structure.
- Project PALADIN domain model, proposed architecture, and telemetry/agent-protocol JSON schemas.
- ADR-0001: stack and rendering engine (Next.js/Tailwind/PixiJS frontend, FastAPI/Python backend).
- `apps/web` and `apps/sim` scaffolding, proven to talk to each other end to end.
- Disposable PixiJS pan/zoom rendering prototype at `prototypes/console-render`.
- ADR-0002, ADR-0003, ADR-0004: physical emulation, routing math, and ATHENA's verification model.
- Phase 1 complete: the engine's architecture, data contracts, and algorithms are all settled.

### Changed

- Faults can now target a specific edge (`affectedEdgeIds`), not only nodes, found while grilling ADR-0004 against a concrete scenario.
- ADR-0004's no-secondary-cascade check now also requires the originally-faulted node to actually improve, not just that nothing new breaks.

- Phase 2 complete: the engine runs end to end, headless. Station graph, physics, routing, fault injection, the tick and one-tick-forward projection, ATHENA's four-constraint checker, the five-agent squad, and real websocket streaming.
- Fixed along the way, not planned: a shared-link contention bug, a thermal zone with no cooling path, a cascade-check bar that wrongly rejected every reroute fix, and a schema ambiguity between two structurally identical payload shapes.
- Phase 3 complete: the Tactical Console is live (PixiJS, node/edge status and alarm colours, a hand-rolled dashed flow per edge type, a tuned CRT filter, a fault-flicker burst, camera auto-focus onto a fault's affected nodes). The Operations Deck is live (five agent status cards with retro iconography, a live mission log feed, a cockpit HUD, a synthesised alarm klaxon with a persistent mute toggle, a dark/light theme toggle for the chrome only). ATHENA's card has a distinct checking pulse and MERCURY's a rejected-fix flash. An incident replay/scrub control lets a finished incident be rewound and re-watched from its recorded telemetry/agent-protocol stream. The settled visual language is captured in ADR-0005.
- Fixed along the way, not planned: ORION never broadcast the intermediate agent-protocol trace, only the final verdict; `active_faults` was append-only and never cleared once a fix resolved it; a regression where the earlier fix silently broke the flicker burst's fault-detection for any fault resolved within the same request; a `localStorage` read/write race that lost the mute preference on reload.
- Phase 4 complete: the Tactical Console is a visualised data centre now, not an abstract graph. A tile-grid floor plan (derived from the simulation's own layout, not hand-placed) with hand-baked pixel-art room/machine sprites per node type and corridor sprites with a travelling flow pulse per edge type. Five agent characters, idle pose and tile-to-tile movement triggered by the live agent-protocol stream, routed with the same pathfinding corridors use. The alarm treatment is a palette swap, not a filter, measured to bleed far less than the alternative tried. Camera auto-focus, the CRT filter, and the fault-flicker burst all carried over from Phase 3 onto the new coordinate system. Chiptune commit/rollback cues extend the existing klaxon. The Operations Deck is reskinned as RPG-dialogue-box pixel-art chrome, with agent portraits consistent with their full sprites. The settled visual language is captured in ADR-0006, superseding ADR-0005's rendering decisions.
- Fixed along the way, not planned: a batching bug where checking only a messages array's last entry silently dropped messages when React batched several socket updates (or a whole fault trace) into one render, found and fixed independently in both agent movement and the new chiptune SFX.

### Planned

- A parallel backlog (#30-#49) deepening ATHENA with Z3 and topological formal verification, not yet started.
- A small README backlog (#19-#22), deferred.
