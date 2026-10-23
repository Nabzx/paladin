# 0003: Routing and scheduling math

## Status

Accepted

## Context

Ticket #5 needed MERCURY's routing algorithm for both packet rerouting and workload migration. See `docs/research/issue-5-routing-math.md`.

## Decision

- Packet rerouting: Dijkstra shortest path (`networkx`), weighted by inverse remaining capacity, recomputed when a `network_link`'s status changes.
- Workload migration: greedy best-fit over servers with spare capacity, escalated to min-cost matching only if thrashing is observed.
- `fix_proposal.targetNodeIds` carries both a migration target and a reroute path, no schema change.

## Consequences

- `apps/sim/paladin_sim/engine/routing/` has a concrete, implementable algorithm.
- Greedy best-fit is deliberately not the most sophisticated option available. If it visibly misbehaves once built, that's grounds for a follow-up ADR, not a sign this one was wrong.
