# Issue #10: Grilling the Phase 1 ADRs against a concrete fault scenario

## Scenario

A cooling containment breach severs the coolant line feeding thermal zone `THERM-N`. `THERM-N` is shared by `SRV-01` and `SRV-02` (the layout used in the `prototypes/console-render` prototype). Walking this end to end, on paper, through ADR-0001 to ADR-0004, before any of it gets built.

## Step through

1. **Fault injection.** `cooling_breach` fires with `affectedNodeIds: ["THERM-N"]`, per `telemetry.schema.json`.
2. **VULCAN's physics (ADR-0002).** The coolant line to `THERM-N` needs to flip to `severed` so `cooling_i` drops to zero and the diffusion formula lets `THERM-N`'s temperature climb. This only works if the fault injector can identify *which edge* to sever.
3. **MERCURY's response (ADR-0003).** The fix is to reduce heat generation at `THERM-N` by migrating a workload off `SRV-01` or `SRV-02`. Greedy best-fit picks a target by spare capacity and a live network path.
4. **ATHENA's gate (ADR-0004).** The one-tick-forward projection should confirm the fix is safe and actually helps.
5. **ORION.** Coordinates VULCAN's diagnosis and MERCURY's fix, and turns ATHENA's verdict into a commit or rollback.

## Seams found

### 1. Faults can't target edges, only nodes

`telemetry.schema.json`'s `fault` object only carries `affectedNodeIds`. But `cooling_breach` is fundamentally an edge event, it severs a `coolant_line`, not the thermal zone node itself. Without an edge reference, the fault injector (#14) would have to guess which coolant line to sever by inference from the node, which works here but won't for a fault like a micrometeoroid puncture that severs a specific `power_line` without touching either endpoint's own state.

**Resolution**: add an optional `affectedEdgeIds` array to the `fault` object in `telemetry.schema.json`. Applied directly, see the diff on this ticket's commit.

### 2. ATHENA's no-secondary-cascade check doesn't check the fix actually helps

ADR-0004's fourth constraint, as written, only checks that *no new node* flips to critical. A migration that does nothing, for example moving the workload from `SRV-01` to `SRV-02`, both still inside `THERM-N`, would pass that check cleanly: nothing new goes critical, because nothing was fixed either. The constraint as worded guards against making things worse, not against doing nothing.

**Resolution**: amend ADR-0004's fourth constraint to also require the projection show the originally faulted node's trajectory improving (temperature falling or load easing), not only the absence of new criticals. Applied directly to `docs/adr/0004-athena-verification.md`.

This is the most important catch: without it, MERCURY could repeatedly propose useless same-zone migrations that ATHENA would wrongly accept.

### 3. ORION and ATHENA's responsibilities overlap in wording

The brief gives ORION "final validation handshakes", while ATHENA is "every fix... passes through Athena's validation step before it is applied." Read literally, that's two validators. The sensible reconciliation: ATHENA is the only one who validates; ORION's "handshake" is receiving ATHENA's verdict and turning it into a commit against engine state or a rollback signal back to the proposing agent, not a second validation pass.

**Resolution**: tightened the wording in `CONTEXT.md`'s ORION bullet and `docs/architecture/ARCHITECTURE.md`'s flow description to make this explicit.

## Outcome

All three seams resolved inline, no follow-up tickets needed. Nothing here changes ADR-0001, ADR-0002, or ADR-0003's actual decisions, only ADR-0004's wording and the telemetry schema's fault shape.
