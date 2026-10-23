"""ATHENA's power balance constraint, per ADR-0004."""

from paladin_sim.sim_loop import SimulationState


def check_power_balance(projected_state: SimulationState, fix: dict) -> tuple[bool, str | None]:
    """None of the nodes this fix touches end up critical from a power
    overload in the projected state.

    Scoped to the fix's own source/target nodes, not the whole graph.
    Whether some unrelated node is already critical is #26's concern (the
    general no-secondary-cascade check), not this one's.
    """
    touched_ids = [node_id for node_id in [fix.get("sourceNodeId"), *fix.get("targetNodeIds", [])] if node_id]

    overloaded = [
        node_id
        for node_id in touched_ids
        if (node_data := projected_state.graph.nodes.get(node_id)) is not None
        and node_data["type"] == "server"
        and node_data["status"] == "critical"
    ]

    if overloaded:
        return False, f"power overload on {', '.join(overloaded)} after applying this fix"
    return True, None
