"""ATHENA's topology connectivity constraint, per ADR-0004."""

import networkx as nx

from paladin_sim.engine.graph_utils import power_line_predecessors
from paladin_sim.engine.routing.reroute import live_network_graph
from paladin_sim.sim_loop import SimulationState


def _has_live_power_path(graph: nx.DiGraph, server_id: str) -> bool:
    """Walks power_line predecessors up to a root. False the moment a
    severed edge blocks the way, not false just for lacking a battery.
    """
    node = server_id
    visited = set()
    while node not in visited:
        visited.add(node)
        predecessors = power_line_predecessors(graph, node)
        if not predecessors:
            return True
        upstream_id, data = predecessors[0]
        if data["status"] == "severed":
            return False
        node = upstream_id
    return True


def check_connectivity(projected_state: SimulationState, fix: dict) -> tuple[bool, str | None]:
    """A proposed fix must not disconnect any touched server from its
    power source or from the live network graph.

    'Connected to the network' here means present in the live network_link
    graph at all, not reachable to a specific dependency, that's already
    #13's job when a migration target is chosen.
    """
    touched_servers = [
        node_id
        for node_id in [fix.get("sourceNodeId"), *fix.get("targetNodeIds", [])]
        if node_id
        and (node_data := projected_state.graph.nodes.get(node_id)) is not None
        and node_data["type"] == "server"
    ]

    network_graph = live_network_graph(projected_state.graph)

    problems = []
    for server_id in touched_servers:
        if not _has_live_power_path(projected_state.graph, server_id):
            problems.append(f"{server_id} has no live power path")
        if server_id not in network_graph:
            problems.append(f"{server_id} is isolated from the network")

    if problems:
        return False, "; ".join(problems)
    return True, None
