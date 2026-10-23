"""The fixed-timestep simulation tick, and ATHENA's one-tick-forward projection."""

import copy
from dataclasses import dataclass, field

import networkx as nx

from paladin_sim.engine.physics.electrical import step_electrical
from paladin_sim.engine.physics.thermal import step_thermal


@dataclass
class SimulationState:
    graph: nx.DiGraph
    tick: int = 0
    active_faults: list[dict] = field(default_factory=list)


def advance_tick(state: SimulationState, dt: float = 1.0) -> None:
    """Advance physics by one fixed timestep, in place.

    Faults and fixes are discrete events applied separately (see
    paladin_sim.engine.faults and apply_fix below), not generated here.
    """
    step_thermal(state.graph, dt=dt)
    step_electrical(state.graph)
    state.tick += 1


def apply_fix(graph: nx.DiGraph, fix: dict) -> None:
    """Apply a fix_proposal (agent-protocol.schema.json shape) to graph state.

    migrate_workload moves loadDelta of load from sourceNodeId to the first
    of targetNodeIds. reroute_circuit needs no mutation: routing (#13) is
    computed on demand, not stored as persistent flow assignment, so this
    is a deliberate no-op, not a stub. Any other action raises, there's no
    silent no-op for an action nothing has actually implemented.
    """
    action = fix["action"]

    if action == "migrate_workload":
        source_metrics = graph.nodes[fix["sourceNodeId"]]["metrics"]
        target_metrics = graph.nodes[fix["targetNodeIds"][0]]["metrics"]
        moved = min(fix.get("loadDelta", 0.0), source_metrics["powerLoadPercent"])
        source_metrics["powerLoadPercent"] -= moved
        target_metrics["powerLoadPercent"] = min(100.0, target_metrics["powerLoadPercent"] + moved)
    elif action == "reroute_circuit":
        pass
    else:
        raise ValueError(f"apply_fix doesn't know how to apply action {action!r}")


def project_one_tick(state: SimulationState, hypothetical_fix: dict | None = None) -> SimulationState:
    """A disposable projection: copy state, optionally apply a hypothetical
    fix, advance one tick, and return the result.

    Never mutates the real state, ATHENA's no-secondary-cascade check
    (ADR-0004) needs to be able to call this speculatively, for a proposal
    that might end up rejected, without side effects on the running sim.
    """
    scratch = copy.deepcopy(state)
    if hypothetical_fix is not None:
        apply_fix(scratch.graph, hypothetical_fix)
    advance_tick(scratch)
    return scratch
