# 0005: Visual language

## Status

Accepted for Phase 3. Phase 4 (#108) is deliberately moving the Console and Operations Deck from this line/circle schematic language to a retro pixel-art one, superseding most of the look described below. This ADR stays as the historical record of what Phase 3 actually settled on; a new ADR replaces it once Phase 4's own look has settled (#126). Not everything here is superseded, the dramatised-timing philosophy and the semantic-vs-chrome colour rule are still the standing convention.

## Context

Phase 3's visual-polish tickets (#50-#67) each made a colour, motion, or timing decision
independently, live-verified one at a time, not planned as a single upfront system. Issue #69
asked for that language to be captured in one place once it had actually settled, so later
frontend work doesn't silently drift from what was deliberately chosen. See
`docs/research/issue-69-visual-language.md` for the full reasoning and the evidence behind
each point below.

## Decision

- **Identity colours come from the station's own typed node/edge vocabulary** (`Console.tsx`'s
  `NODE_COLOR`/`EDGE_TYPE_COLOR`), never a palette invented for a single component. Every other
  colour that needs an identity (agent accents, avatar glyphs) is drawn from this same source.
- **Status always overrides identity.** A node or edge that is degraded, critical, congested, or
  severed shows that before it shows what type it is.
- **Severity colours are the repository's own GitHub label colours** (p1/p2/p3), not a separate
  palette, so the console's urgency language matches the project's own issue-tracking language.
- **Semantic colours are fixed constants; only neutral chrome is themeable.** A colour that
  carries meaning (identity, severity, a pass/fail verdict) never changes between the dark and
  light chrome themes. Only structural chrome (panel backgrounds, borders, secondary/tertiary
  text, `--chrome-*` tokens) does.
- **ATHENA's card colour is the one deliberately dynamic exception**, driven entirely by her
  actual last action rather than a fixed accent, the single bold colour choice in the system,
  not diluted across multiple components.
- **Three distinct pulse treatments for three distinct meanings**: a sustained oscillating glow
  for an ongoing alarm, a fixed near-white held pulse for an action in progress, a brief flash in
  alarm-red for a reaction to one event. Duration itself carries meaning, a flash is shorter than
  a hold.
- **Every edge type animates with its own dash pattern and a physically correct direction**
  (source to destination); a severed edge never animates. The same dash convention extends into
  iconography (MERCURY's avatar).
- **No UI timing is derived from real backend elapsed time.** The backend resolves a fault
  synchronously, in milliseconds; every on-screen duration (flicker burst, camera glide, active
  glow hold, checking pulse, rejected-fix flash) is chosen for human perception, not measured
  from the actual event.
- **The whole system reads as a schematic instrument, not a dashboard or an illustration**: thin
  strokes, sharp angles, monospace type, a tuned-down CRT filter, mission-patch iconography that
  literally depicts function rather than decorates it.
- **Four fixed overlay quadrants** around the full-viewport console (top-left status, top-right
  agent cards, bottom-left mission log, bottom-right HUD), a fifth (bottom-centre) added for the
  replay scrubber. A new overlay looks for an open quadrant before stacking onto an existing one.

## Consequences

- Before adding a new colour anywhere in the frontend, the question is "does this carry
  meaning?" If yes, it's a fixed constant, reused from the existing vocabulary where possible,
  not a fresh hex value. If no, it's a `--chrome-*` token.
- Before adding a new animated or timed effect, the duration should be chosen for how long a
  human needs to perceive it, not for how long the underlying event actually took, matching the
  table of precedents in the research note.
- A future design review (a sixth agent, a new fault type, a new overlay) should check itself
  against this ADR before introducing a new colour, pulse treatment, or timing convention, rather
  than inventing one from scratch.
- This ADR is about the look only. Process conventions (live pixel verification before claiming
  a visual change is correct, research-before-implementing) are `AGENTS.md`/`CLAUDE.md`'s concern,
  not repeated here.
