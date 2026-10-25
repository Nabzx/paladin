"""MERCURY: Workload & Network Router.

The only agent with an actually implemented remediation action, see #17's
research comment: migrate_workload and reroute_circuit are the only two
apply_fix (#15) knows how to do, and both are MERCURY's.
"""

from paladin_sim.engine.routing.migrate import find_migration_target
from paladin_sim.engine.routing.reroute import find_reroute
from paladin_sim.sim_loop import SimulationState

DEFAULT_LOAD_DELTA = 30.0


def propose_migration(
    state: SimulationState,
    fault: dict,
    source_server_id: str,
    proposal_id: str,
    excluded_target_ids: set[str] | None = None,
) -> dict | None:
    """A migrate_workload fix moving load off source_server_id, or None if
    no viable target exists."""
    target = find_migration_target(
        state.graph, source_server_id, DEFAULT_LOAD_DELTA, excluded_target_ids=excluded_target_ids
    )
    if target is None:
        return None

    return {
        "proposalId": proposal_id,
        "faultId": fault["id"],
        "action": "migrate_workload",
        "sourceNodeId": source_server_id,
        "targetNodeIds": [target],
        "loadDelta": DEFAULT_LOAD_DELTA,
    }


def propose_reroute(state: SimulationState, fault: dict, from_id: str, to_id: str, proposal_id: str) -> dict | None:
    """A reroute_circuit fix around a severed network_link, or None if no
    live alternate path exists."""
    path = find_reroute(state.graph, from_id, to_id)
    if path is None:
        return None

    return {
        "proposalId": proposal_id,
        "faultId": fault["id"],
        "action": "reroute_circuit",
        "targetNodeIds": path,
    }
