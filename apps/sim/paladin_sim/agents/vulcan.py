"""VULCAN: Thermal & Fluids Governor.

Diagnoses thermal trouble. VULCAN has no implemented remediation action of
its own, see #17's research comment, so it only identifies where the
problem is, ORION and MERCURY handle fixing it.
"""

import networkx as nx

from paladin_sim.sim_loop import SimulationState


def diagnose_overheating_zones(state: SimulationState, fault: dict) -> list[str]:
    """Thermal zones this fault names directly. Empty if it isn't a
    thermal matter."""
    graph = state.graph
    return [
        node_id
        for node_id in fault.get("affectedNodeIds", [])
        if node_id in graph.nodes and graph.nodes[node_id]["type"] == "thermal_zone"
    ]


def servers_feeding(state: SimulationState, zone_id: str) -> list[str]:
    """Server ids whose coolant_line feeds the given thermal zone."""
    graph: nx.DiGraph = state.graph
    return [
        u
        for u, _, data in graph.in_edges(zone_id, data=True)
        if data["type"] == "coolant_line" and graph.nodes[u]["type"] == "server"
    ]
