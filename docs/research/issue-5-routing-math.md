# Issue #5: Routing and scheduling math for workload migration and packet rerouting

## Question

What algorithm drives MERCURY's two jobs: rerouting network packets around a severed or congested link, and migrating a workload off an overloaded or at-risk server, fast enough to propose a fix within a simulation tick?

## Options considered

### Packet rerouting

| Option | Cost | Fit |
|---|---|---|
| Dijkstra shortest path, recomputed on the affected component when topology changes | Cheap, event-driven, not per-tick | Matches the scale, `networkx` ships this |
| K-shortest paths or ECMP for redundancy | More complex, more realistic | Not needed until multiple simultaneous reroutes compete for the same link |
| Full min-cost max-flow | Handles capacity exactly | Overkill for a station graph of a few dozen nodes |

### Workload migration

| Option | Cost | Fit |
|---|---|---|
| Greedy best-fit: pick the first reachable server with enough spare capacity | Cheap, simple to reason about | Good default, matches the project's own "don't design for hypothetical future requirements" style |
| Hungarian algorithm or min-cost matching for globally optimal placement | Correct even with several simultaneous migrations | Only worth it if greedy visibly thrashes, not assumed up front |

## Recommendation

- **Packet rerouting**: Dijkstra's shortest path over the network-link subgraph, edge weight the inverse of remaining capacity (so congested links are avoided before they're chosen), recomputed only when a `network_link`'s status changes, via `networkx.dijkstra_path`.
- **Workload migration**: greedy best-fit. Sort candidate servers by spare capacity, place on the first one with enough headroom and a live path to the workload's dependencies. Escalate to a min-cost matching only if greedy is seen to thrash in practice, that's a future ticket, not a Phase 1 commitment.

## Confirms

`fix_proposal`'s `targetNodeIds` (an ordered array) is sufficient for both: a single-element list names a migration target, a multi-element list names a reroute path. No change needed to `agent-protocol.schema.json`.

## Verdict

Confirmed. Promoted to [ADR-0003](../adr/0003-routing-math.md).
