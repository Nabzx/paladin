# Issue 126: Phase 4's retro pixel-art visual language, as it actually settled

Phase 4's tickets (#108-#125, plus the un-numbered swap-in tracked as #139) were built one at a
time across camera, sprites, movement, audio, and chrome, each live-verified before moving to the
next. This note looks back across all of them and writes down the language that actually emerged,
not what was planned upfront, per the ticket's own instruction and the same process #69 used for
Phase 3.

## Rendering: tiles and sprites, not a free canvas

**The floor plan is a derived, repeatable rule, not hand-placed coordinates** (#111, #115).
`buildFloorPlan.ts` rescales the simulation's own node layout onto an integer tile grid
(`tileX = round(worldX / 40)`), reusing the existing left-to-right power/coolant/network flow
rather than inventing a fresh one. Corridors route with a two-option orthogonal L-bend heuristic,
falling back to real grid pathfinding (BFS) for the cases that need it — confirmed against the
real 10-node, 14-edge sample topology, not a toy example. Re-running the same pipeline against a
changed topology needs no hand-editing.

**Every sprite — room, corridor, agent — is baked from a hand-typed character grid, never a
shipped image asset** (#110, #117, #118, #119). A sprite is a 16x16 grid of single-character
strings mapped to a small named palette (`Record<string, number>`), `.` for transparent, baked
once per `Application` via `renderer.generateTexture()` into a `Texture`, then drawn as `Sprite`
instances that all share it. This keeps every sprite inspectable and diffable as plain text, the
same reasoning the hand-rolled dashed edges (#52) and flicker burst (#57) used for motion: no
binary asset to fetch or license.

**`scaleMode` must be passed through `textureSourceOptions` at generation time, not set on the
texture afterward** (#110). `texture.source.scaleMode = "nearest"` after the fact measurably does
nothing — 63 interpolated colours instead of a palette's actual 6. The fix,
`renderer.generateTexture({ target, textureSourceOptions: { scaleMode: "nearest" } })`, is the one
technical gotcha worth flagging prominently for any future sprite work in this codebase.

**One shared structural palette per sprite family, one accent colour that varies** (#117, #119).
Node sprites share frame/panel/shading/vent tones (`F`/`P`/`D`/`V`) with one `L` accent per node
type, lifted from the old `NODE_COLOR` scheme so the new rendering stays semantically continuous
with the one it replaced. Agent sprites share one humanoid shell (helmet, visor, torso, legs)
with a distinct chest-badge glyph and accent per agent, lifted from `OpsDeck.tsx`'s existing
`AGENTS` accent table. The agent avatar portraits (#123) crop that same badge motif into a 12x12
icon, so a card's portrait and the sprite walking the floor plan read as the same character.

## Status and alarm: palette swap, not a filter

**A degraded/critical node's alarm state is a second baked texture with the accent colour
swapped, not `GlowFilter` or a `Sprite.tint`** (#113, #121). Measured directly: `GlowFilter`
bleeds a soft halo through every internal transparent gap a detailed sprite has (318 distinct
colours in the render region), where a flat circle only ever had one outer edge to glow. A
palette swap keeps exactly the palette's own colours (6, measured) with zero bleed. The alarm
texture blinks against the normal one (#121), a cheap follow-up #113 itself flagged: most retro
games blink an alarm state rather than holding it statically. Severity still picks the colour
exactly as `Console.tsx`'s `glowColorForNode` always did (most recent matching fault wins,
falling back to a plain degraded/critical colour) — ADR-0005's severity-colour rule is unchanged,
only the paint technique is.

## Camera and motion

**The camera is the same `pixi-viewport` instance Phase 3 already proved smooth (#8, #77),
reconfigured over the tile grid's real bounds instead of the old abstract layout** (#116). Tile
coordinates can be negative, so every conversion from tile space to world pixels goes through one
`tileToWorld` function that offsets by the floor plan's own minimum, never a bare multiply.

**Auto-focus (#63) carries over verbatim onto the new coordinate system** (#124): the same 700ms
glide, the same single-node-fixed-zoom vs two-or-more-node-bounding-box cases, the same clamp
range, just computed over tile->world points. Nothing about *how* the camera reacts to a fault
changed, only *what space* it reacts in.

**Corridor flow and agent movement are the same kind of animation, built on the same geometry
helper** (#118, #120). `corridorPolyline`/`polylineLength`/`pointAtDistance` turn a tile path into
a walkable line; a travelling pulse sprite uses it for current/coolant/network flow, and an
agent's walk reuses the exact same function for its own tile-to-tile movement. An agent's path is
computed with `buildFloorPlan`'s own corridor-routing function (now exported), not a second,
naive pathing system — the same reasoning #111 already established for corridors applies
identically to a walking character: either one can cut through an unrelated room if it ignores
the other rooms' occupied tiles.

**Agent movement speed is a constant, not a fixed duration** (#112, #120): `TILE_SIZE / 200ms`,
the classic JRPG overworld pace, so a short walk finishes sooner than a long one. This is the one
motion in the console whose duration is proportional to something physical (real tile distance)
rather than chosen purely for human perception — everything else (corridor flow phase, alarm
blink, camera glide, flicker burst) still follows ADR-0005's no-real-elapsed-time rule unchanged.

**A real batching bug was found and fixed twice this phase, not once** (#120, #125): checking
only a messages array's last entry misses messages when React batches several
`socket.onmessage` updates — and a fault's own trace — into one render. Both the agent-movement
handler and the chiptune-SFX hook were fixed to track seen message ids by set membership instead.
Any future code reacting to the `messages` stream should default to this pattern, not the
single-last-message check Phase 3's `fault_alert`-only effects got away with.

## Audio

**Chiptune cues extend #61's existing klaxon hook, sharing its `AudioContext`, mute toggle, and
persisted preference, not a second audio system** (#114, #125). The klaxon's sawtooth stays the
alarm's own waveform; square-wave oscillators (confirmed at the raw PCM sample level to be the
actual NES/Game Boy APU waveform, not just asserted) are new for commit (an ascending
C5-E5-G5-C6 arpeggio) and rollback (the same four notes, descending — the inverse shape, not a
second note set).

## Chrome

**The Operations Deck's panels are RPG-dialogue-box chrome: stepped clip-path corners and a
double-line frame, pure CSS, no border-image asset** (#122). A two-tier pixel font pairing (Press
Start 2P for short labels, VT323 for running text, both via `next/font/google`) replaces the
monospace terminal type. None of the underlying data or behaviour changed — every live-data path
(#58, #59, #62, #67, #68) was re-verified live after the reskin, not assumed unaffected.

## What this supersedes, and what it doesn't

Everything in "Rendering," "Status and alarm," and most of "Camera and motion" above replaces
ADR-0005's line/circle schematic language and GlowFilter-based alarm pulse. But ADR-0005 settled
several things that are about *how a decision gets made*, not about pixels, and none of those
needed revisiting:

- **Status always overrides identity.** Unchanged, just expressed as a palette swap instead of a
  fill colour or filter.
- **Semantic colours are fixed constants; only neutral chrome is themeable.** Unchanged, still the
  rule separating the node/agent/severity palette from `--chrome-*` tokens.
- **No UI timing is derived from real backend elapsed time.** Still the rule for every effect
  except agent movement's own tile-distance-proportional speed, which is a genuinely different
  kind of motion (it's covering real space, not reacting to an instant) rather than an exception
  to the rule.
- **Severity colours are the project's own GitHub label colours.** Unchanged.

What's gone: the "thin strokes, sharp angles, monospace type" schematic-instrument description,
the four-fixed-overlay-quadrants layout note (the quadrants themselves are untouched by this
phase, but the pixel-art chrome treatment is the relevant new rule now), and the GlowFilter-based
pulse vocabulary.
