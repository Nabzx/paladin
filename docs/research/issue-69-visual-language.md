# Issue 69: the visual language, as it actually settled

Phase 3's visual-polish tickets (#50-#67) were built one at a time, each live-verified before
moving to the next. This note looks back across all of them and writes down the language that
actually emerged, not what was planned upfront. Written now, once the look had settled, not
speculatively ahead of the decisions, per the ticket's own instruction.

## Colour

**Identity colours come from the station's own typed vocabulary, never a palette invented for a
single component.** `Console.tsx`'s `NODE_COLOR` (one hex per node type: server green, thermal
cyan, power amber, network purple, battery violet, radiator pale blue) is the source of truth.
Everything downstream reuses it:

- The five agent cards' identity accents (#58) are drawn directly from it: ORION takes the
  server green (her "voice" already is that colour, she's the one who narrates the station's
  top-left status line), VULCAN and TESLA take their domain's node colour, MERCURY takes
  `network_link`'s purple, brightened for a UI accent against near-black rather than a graph
  line's own dark canvas.
- The agent avatar glyphs (#60) use `currentColor`, inheriting whatever the card is already
  showing, no colour decisions of their own.

**Status always overrides identity.** `STATUS_TINT` (critical red, degraded amber) overrides
`NODE_COLOR` the moment a node stops being nominal, same pattern on edges
(`EDGE_COLOR` overrides `EDGE_TYPE_COLOR` for congested/severed). Something being wrong always
outranks what kind of thing it is.

**Severity colours are the project's own GitHub label colours, not invented ones.**
`SEVERITY_COLOR` (p1/p2/p3) is lifted directly from the repository's issue-tracking severity
labels, so the console's urgency language is literally the same language the issue tracker
already uses. This propagates everywhere severity shows up: node alarm glow, the mission log's
`fault_alert` lines, the cockpit HUD's active-fault reading.

**One rule, drawn sharply in #67: semantic colours never change, chrome colours do.** A colour
that *means* something (an agent's identity, a severity level, a pass/fail verdict) stays fixed
across the light and dark chrome themes, flipping it would make it wrong, not just differently
styled. Only neutral structure (panel backgrounds, borders, secondary/tertiary text) is a theme
token (`--chrome-*` custom properties in `globals.css`). This is the one line that should never
be crossed by future work: before adding a new colour, ask whether it carries meaning. If it
does, it's a constant. If it doesn't, it's a `--chrome-*` token.

**ATHENA is the deliberate exception, and the one bold colour move in the whole system.** Every
other agent has a fixed identity accent. ATHENA has none: her card colour is entirely derived
from her actual last action (pass green, fail red, a distinct near-white while checking, grey
while idle). This was a conscious choice (#58's own commit message calls it out explicitly) to
spend the one "bold" visual risk in the system on the one agent whose entire job is rendering a
verdict, not announcing an identity, rather than diluting it across several components.

## Glow and pulse: three distinct meanings, three distinct treatments

A single mechanism (`pulseOverride` in `AgentCard`, generalised in #66 from what started as a
checking-only prop) drives three states that must read as different from each other:

- **Sustained alarm** (a degraded or critical node, #50): a `GlowFilter` whose `outerStrength`
  oscillates on a shared sine-wave phase, one phase drives every currently-alarmed node in
  lockstep, cheap regardless of how many are alarmed at once. Colour is whichever fault's
  severity last touched that node, or the status tint if no fault payload is available.
- **An action in progress** (ATHENA's checking pulse, #65): a fixed near-white colour with a CSS
  `animate-pulse`, held for 1.1 seconds. Deliberately not the sustained-alarm mechanism and
  deliberately not any agent's identity colour or verdict colour, so "I am actively doing
  something" cannot be confused with either "something is wrong" or "here is the result."
- **A reaction to one event** (MERCURY's rejected-fix flash, #66): the same pulse mechanism,
  the same alarm-red as a critical node, held for only 600ms, shorter than the checking pulse on
  purpose, a flash reacts to a single thing that just happened, a hold represents an ongoing
  process. The duration difference is itself part of the vocabulary, not an arbitrary tuning
  choice.

A node or card that is simply fine never pulses. Stillness is also part of the language: an
idle, nominal element should look inert, not holding back some low-level ambient animation.

## Flow and motion

**Edges carry a directional, typed animation, not a static line.** Each of the three edge types
(power, coolant, network) gets its own hand-rolled dash pattern (PixiJS v8 ships no dash
support, see ADR-0001) with a distinct length, gap, and speed, so the three kinds are
distinguishable at a glance without a legend (#52, #53). Direction always runs from source to
destination (battery toward servers, servers toward radiator, `-(phase % cycle)` was tried
first and was backwards, a bug caught and fixed, not a design choice). A severed edge never
animates: current, coolant, or network traffic cannot physically be moving through a line that
can't carry it, so severed edges fall back to a static stroke, full stop, not a slowed-down
version of the live animation.

**The dash language extends into iconography, not just the graph.** MERCURY's avatar glyph
(#60) is a three-node routed path with one leg drawn dashed, using the exact same
`strokeDasharray` convention the console's own `network_link` edges use. A small, deliberate
thread tying the Operations Deck's iconography back to the thing it's actually reporting on,
rather than treating icons as a separate decorative layer.

## Timing: every event is dramatised on purpose

The single throughline across nearly every ticket in this phase: **the backend resolves a fault
synchronously, in milliseconds. A human needs longer than that to perceive that something
happened.** Nothing in this console's timing is derived from real elapsed backend time, every
duration is a deliberate choice for human perception:

| Effect | Duration | Why that long |
|---|---|---|
| Flicker burst on fault injection (#57) | 260ms | Long enough to read as a flicker, short enough to stay "a burst," not "a sustained effect" |
| Camera auto-focus glide (#63) | 700ms | A glide, not a snap, matches the pace a human would actually pan at |
| Agent card active glow hold (#58) | 1.8s | The backend's whole response trace for one fault can arrive within tens of milliseconds, a purely real-time indicator would be imperceptible |
| ATHENA's checking pulse (#65) | 1.1s | Shorter than the general active hold, stands in for her actual checking time rather than filling a gap between messages |
| MERCURY's rejected-fix flash (#66) | 600ms | Shorter again, a flash reacting to one event, not a held state |

New visual events should pick a duration the same way: not "however long the thing actually
took," but "how long does a person need to register this happened."

## Schematic, not photographic

Every visual element in this phase reads as a technical instrument, not a soft or organic
illustration: thin strokes, sharp angles, monospace type throughout, a CRT scanline/vignette
filter tuned down from its library defaults specifically to stay legible over aesthetic
flourish (#55), and evaluated once against a hand-rolled alternative that measured objectively
worse and was rejected (#56, closed with no code change). The five agent avatars (#60) are
mission-patch glyphs, literal technical depictions of what each agent does (a targeting
reticle, a thermometer, a bolt, a routed path, a gated shield), not portraits and not abstract
marks. The cockpit HUD (#62) is three gauges in one bordered instrument strip, not three
separate dashboard cards. This reads as "a schematic of a real system," which is the brief's
own framing (CONTEXT.md), not as a generic SaaS dashboard wearing a dark theme.

## Layout

Four fixed overlay quadrants around the full-viewport Tactical Console, each with a single
job, none of them overlapping in normal use: top-left (station title, connection status, theme
and alarm toggles), top-right (the five agent status cards), bottom-left (the mission log),
bottom-right (the cockpit HUD). The incident replay scrubber (#68) took the one quadrant left
unclaimed, bottom-centre. A future overlay should look for an genuinely open slot before
stacking onto an existing one.

## What this note deliberately leaves out

This is about the *look*: colour, motion, timing, iconographic style. It does not cover
process (live pixel verification before claiming a visual change is correct, research-before-
implementing), that's already the project's standing convention, documented in `AGENTS.md` and
`CLAUDE.md`, not a visual-language decision.

## Verdict

Confirmed, the look has settled and is consistent across every ticket reviewed. Promoted to
[ADR-0005](../adr/0005-visual-language.md).
