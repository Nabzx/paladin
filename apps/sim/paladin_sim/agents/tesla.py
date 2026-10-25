"""TESLA: Electrical Grid Overseer.

Diagnoses power trouble. Like VULCAN, TESLA has no implemented remediation
action of its own, it identifies which server is at risk, MERCURY handles
fixing it.
"""

from paladin_sim.sim_loop import SimulationState


def diagnose_overloaded_servers(state: SimulationState, fault: dict) -> list[str]:
    """Server ids this fault names directly. Empty if it isn't an
    electrical matter."""
    graph = state.graph
    return [
        node_id
        for node_id in fault.get("affectedNodeIds", [])
        if node_id in graph.nodes and graph.nodes[node_id]["type"] == "server"
    ]
