# 0006: Pixel-art visual language

## Status

Accepted. Supersedes ADR-0005's rendering decisions (the line/circle schematic look and the
GlowFilter-based alarm pulse). Does not supersede ADR-0005's process rules that are about how a
decision gets made rather than about pixels — see Consequences below for exactly which survive.

## Context

Phase 4 (#108) deliberately moved the Console and Operations Deck from Phase 3's line/circle
schematic language to a retro, tile-based pixel-art one: a visualised data centre with hand-built
sprites and textures, a visible character for each agent, and chiptune audio, rather than an
abstract graph. Each ticket (#109-#125, plus the swap-in tracked as #139) made its own rendering,
motion, or audio decision independently, live-verified one at a time, not planned as a single
upfront system. See `docs/research/issue-126-phase-4-visual-language.md` for the full reasoning
and the evidence behind each point below.

## Decision

- **The floor plan is a derived rule, not hand-placed coordinates**: node positions rescale onto
  an integer tile grid from the simulation's own layout, corridors route with an L-bend heuristic
  falling back to real pathfinding. Re-running it against a changed topology needs no manual
  re-derivation.
- **Every sprite is baked from a hand-typed 16x16 character grid**, a small named palette,
  `renderer.generateTexture()` with `textureSourceOptions: { scaleMode: "nearest" }` (set any
  other way, it has no effect). No shipped image assets.
- **One shared structural palette per sprite family, one accent colour that varies by type/agent**,
  carried over from the colour vocabulary ADR-0005 already established, so the new rendering
  stays semantically continuous with the one it replaces.
- **A degraded/critical node's alarm state is a palette swap (a second baked texture), not a
  filter or a tint.** Measured directly to bleed less (an exact 6 colours vs. 318) through a
  detailed sprite's internal gaps than `GlowFilter`, and it blinks against the normal texture.
- **The camera is the same proven `pixi-viewport` instance, reconfigured over the tile grid's
  real bounds**; auto-focus keeps its exact original glide and single-node/bounding-box logic,
  just computed over tile coordinates.
- **Corridor flow and agent movement share one geometry helper** (a tile path turned into a
  walkable polyline), and an agent's own path is computed by the same corridor-routing function a
  corridor itself uses, never a second pathing system.
- **Agent movement speed is a constant (tile-size / time-per-tile), the one motion in this
  console whose duration is proportional to real distance covered** rather than chosen purely
  for human perception.
- **Code reacting to the live agent-protocol message stream tracks seen message ids by set
  membership, not by checking only the array's last entry.** A real, repeatable failure mode
  (React batching several socket updates, or a whole fault trace, into one render) was found and
  fixed twice independently before this rule was written down.
- **Chiptune SFX extend the existing klaxon's shared `AudioContext`, mute toggle, and persisted
  preference**, not a second audio system. Square-wave oscillators for commit/rollback, confirmed
  at the raw sample level to be the genuine chiptune waveform, distinct from the klaxon's own
  sawtooth.
- **Operations Deck chrome is RPG-dialogue-box styling**: stepped `clip-path` corners and a
  double-line frame, pure CSS, no border-image asset, with a two-tier pixel font pairing (a
  blocky display face for short labels, a readable pixel-terminal face for running text).

## Consequences

- Before adding a new sprite, reuse the 16x16 hand-typed grid + shared-palette pattern and the
  `textureSourceOptions` baking technique, rather than reaching for a shipped image or a runtime
  filter.
- Before adding a new alarm-like status treatment, a palette swap is the default, not a tint or
  filter, unless a specific case is measured to need something else.
- Before adding a new effect that reacts to the live `messages` stream, track seen ids by set
  membership from the start.
- The following ADR-0005 rules are **not** superseded, they describe decision-making rather than
  pixels and this phase re-confirmed rather than revisited them: status always overrides
  identity; semantic colours are fixed constants while only chrome is themeable; no UI timing is
  derived from real backend elapsed time (agent movement's distance-proportional speed is a
  different kind of motion, not an exception); severity colours are the project's own GitHub
  label colours.
- ADR-0005's schematic-instrument description (thin strokes, sharp angles, monospace type,
  GlowFilter-based pulses, the specific overlay-quadrant layout note) is superseded; the pixel-art
  look and its chrome treatment above is now the standing convention for this console.
