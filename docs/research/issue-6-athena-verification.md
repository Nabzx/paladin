# Issue #6: Deterministic verification model for ATHENA

## Question

What does ATHENA actually check before a proposed fix is allowed to touch station state, deterministically, with no hallucination risk, and in a shape that could later be handed to an SMT solver without a rewrite?

## Approach considered

A rule-based checker: a fixed set of pure predicate functions over `(current_state, proposed_fix)`, each returning a pass or fail and a reason. This is the only option in scope for Phase 1, see [ADR-0001](../adr/0001-stack-and-rendering.md) and the Phase 1 map issue: a Z3/SMT-backed version is a candidate upgrade, not a Phase 1 requirement.

## Recommendation

Four constraint categories, each a pure function:

1. **Power balance** — after the fix, no bus's demand exceeds its supply plus available battery buffer.
2. **Thermal limits** — no `thermal_zone`'s projected temperature exceeds a safety ceiling (suggested: 90°C) without a live cooling path reaching it.
3. **Topology connectivity** — the fix does not disconnect any server from its power bus or from the network graph.
4. **No secondary cascade** — a one-tick-forward projection: apply the fix to a scratch copy of state, advance the engine one tick, and check nothing flips from `nominal`/`degraded` to `critical` as a side effect.

The fourth is the load-bearing one. It's what actually earns the brief's "mathematically prove the fix will not cause a secondary blackout" framing, the other three are necessary but not sufficient on their own.

A failing check returns a reason string and a list of violated constraint names, feeding `agent-protocol.schema.json`'s `validationResultPayload.violatedConstraints` directly, no schema change needed.

## The Z3 upgrade path, scoped not built

Each constraint should be written as an explicit inequality or reachability predicate, not ad hoc imperative branching, specifically so it can later be re-expressed as a Z3 assertion (`Real` variables for loads and temperatures, boolean reachability encoding for connectivity) without redesigning the constraint set itself. Building that encoding is explicitly out of scope here.

## Verdict

Confirmed. Promoted to [ADR-0004](../adr/0004-athena-verification.md).
