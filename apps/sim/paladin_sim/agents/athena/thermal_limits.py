"""ATHENA's thermal limits constraint, per ADR-0004."""

import networkx as nx

from paladin_sim.sim_loop import SimulationState

THERMAL_CEILING_CELSIUS = 90.0


def _connected_thermal_zones(graph: nx.DiGraph, server_id: str) -> list[str]:
    return [
        v
        for _, v, data in graph.out_edges(server_id, data=True)
        if data["type"] == "coolant_line" and graph.nodes[v]["type"] == "thermal_zone"
    ]


def check_thermal_limits(projected_state: SimulationState, fix: dict) -> tuple[bool, str | None]:
    """No thermal_zone connected to this fix's touched nodes exceeds the
    safety ceiling in the projected state.

    A ceiling breach fails outright, whether or not some coolant_line
    elsewhere in the zone's plumbing happens to still be live, that line
    not keeping up is exactly the failure this constraint exists to catch.
    Scoped the same way #23 is: only zones connected to the fix's own
    source/target nodes.
    """
    touched_ids = [node_id for node_id in [fix.get("sourceNodeId"), *fix.get("targetNodeIds", [])] if node_id]

    relevant_zones: set[str] = set()
    for node_id in touched_ids:
        node_data = projected_state.graph.nodes.get(node_id)
        if node_data is None:
            continue
        if node_data["type"] == "thermal_zone":
            relevant_zones.add(node_id)
        elif node_data["type"] == "server":
            relevant_zones.update(_connected_thermal_zones(projected_state.graph, node_id))

    overheated = sorted(
        zone_id
        for zone_id in relevant_zones
        if projected_state.graph.nodes[zone_id]["metrics"]["temperatureCelsius"] > THERMAL_CEILING_CELSIUS
    )

    if overheated:
        return False, f"thermal ceiling exceeded at {', '.join(overheated)} after applying this fix"
    return True, None
