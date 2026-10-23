# 0002: Physical emulation model

## Status

Accepted

## Context

Ticket #4 needed an update rule for VULCAN's thermal loop and TESLA's electrical loop, cheap enough to run every simulation tick. See `docs/research/issue-4-physical-emulation.md`.

## Decision

- Thermal: graph Laplacian diffusion across `thermal_zone` and `server` nodes, with heat generated proportional to `powerLoadPercent` and cooling proportional to `coolantFlowRate` on live `coolant_line` edges.
- Electrical: simplified bus-level load balance. Deficits draw from the nearest battery before server `powerLoadPercent` rises and pushes status toward `degraded` or `critical`.
- No full AC power flow or PDE heat solve. Both would be real-world accurate and simulation-irrelevant overkill at this scale.

## Consequences

- `apps/sim/paladin_sim/engine/physics/` has a concrete algorithm to implement, not an open question.
- ATHENA (#6) gets real computed values to check constraints against, not scripted numbers.
- If the demo ever needs more physical nuance (multiple coolant loops with different fluids, AC phase effects), that is a new ADR, not a quiet change to this one.
