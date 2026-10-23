# 0004: ATHENA's verification model

## Status

Accepted

## Context

Ticket #6 needed ATHENA's Phase 1 verification approach: deterministic, zero-hallucination, and compatible with a later SMT upgrade. See `docs/research/issue-6-athena-verification.md`.

## Decision

- Four pure constraint checks: power balance, thermal limits, topology connectivity, and a one-tick-forward no-secondary-cascade projection.
- Each written as an explicit inequality or reachability predicate, not imperative branching, so a later Z3 encoding can reuse the same constraint set.
- `validationResultPayload.violatedConstraints` already carries the result, no schema change.

## Consequences

- `apps/sim/paladin_sim/agents/athena/checker.py` has four concrete functions to implement.
- The no-secondary-cascade check needs the simulation engine to support a cheap, disposable one-tick projection. That's a requirement on the engine's design, worth flagging to whoever builds `sim_loop.py`.
- Z3 integration (`apps/sim/paladin_sim/agents/athena/smt/`) stays a clearly scoped future upgrade, not a Phase 1 obligation.
