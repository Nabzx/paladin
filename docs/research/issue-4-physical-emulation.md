# Issue #4: Physical emulation model for thermal and electrical loops

## Question

What update rule drives VULCAN (thermal and fluids) and TESLA (electrical grid) each simulation tick: cheap enough to run every tick, expressive enough that a fault visibly matters?

## Options considered

| Option | Cost per tick | Fidelity | Fit |
|---|---|---|---|
| Full PDE heat solve (finite element) or SPICE-style circuit simulation | High, needs a numerical solver | Very high | Overkill for a portfolio demo station with dozens of nodes |
| Graph Laplacian diffusion (thermal) and simplified load-balance flow (electrical) | O(nodes + edges) per tick | Good enough to feel physical | Matches the scale and the "convincing, not decorative" bar |
| Static lookup tables, no real update rule | Near zero | None, every fault would be scripted | Defeats the point, ATHENA would have nothing real to check |

The middle option is the standard approximation real-time simulations use, the same family FTL and Oxygen Not Included lean on, and it is the only one that gives ATHENA's future constraint checks something genuinely computed to reason about rather than a scripted number.

## Recommendation

### Thermal (VULCAN)

Heat diffuses across `thermal_zone` and `server` nodes along the station graph, one step per tick:

```
T_i(t+1) = T_i(t) + Δt * [
    k_thermal * Σ_{j in neighbours(i)} (T_j(t) - T_i(t)) / resistance_ij
    + heat_generated_i(t)
    - cooling_i(t)
]
```

- `heat_generated_i` scales with `powerLoadPercent` for server nodes: a busier server runs hotter.
- `cooling_i` scales with `coolantFlowRate` for nodes on an active `coolant_line`, and drops to zero the moment that line's status flips to `severed`, which is exactly what a cooling breach fault does.
- `resistance_ij` defaults to `1` and is a tuning hook, not something to design further now.

### Electrical (TESLA)

A simplified load-balance, not full AC power flow. Phase alignment and transformer modelling, in the brief's sense, are flavour, not something this needs to simulate exactly:

```
demand(bus) = sum of baseLoad over servers fed by bus
supply(bus) = sum of capacity over power_line edges feeding bus,
              severed edges contribute 0, congested edges a reduced capacity

if demand(bus) > supply(bus):
    deficit = demand(bus) - supply(bus)
    draw deficit from the nearest reachable battery's batteryChargePercent
    otherwise, raise the fed servers' powerLoadPercent proportionally,
    which pushes their status toward degraded or critical as it crosses threshold
```

Thresholds (suggested, tunable): `powerLoadPercent` over 85 is `degraded`, over 100 is `critical`.

## Confirms

No change needed to `telemetry.schema.json`: `temperatureCelsius`, `coolantFlowRate`, `powerLoadPercent`, and `batteryChargePercent` already carry what both update rules read and write.

## Verdict

Confirmed. Promoted to [ADR-0002](../adr/0002-physical-emulation.md).
