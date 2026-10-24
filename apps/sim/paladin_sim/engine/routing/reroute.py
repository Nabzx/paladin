"""Packet rerouting for MERCURY, per ADR-0003."""

import networkx as nx

from paladin_sim.engine.graph_utils import effective_capacity


def live_network_graph(graph: nx.DiGraph) -> nx.Graph:
    """The live network_link subgraph, undirected.

    network_link direction in the station graph is nominal, not physically
    meaningful (see grid.py), so routing works over an undirected view.
    Severed edges are dropped entirely.
    """
    network_graph = nx.Graph()
    for u, v, data in graph.edges(data=True):
        if data["type"] != "network_link":
            continue
        capacity = effective_capacity(data)
        if capacity == 0.0:
            continue
        remaining = max(capacity - (data["current_flow"] or 0.0), 0.01)
        network_graph.add_edge(u, v, weight=1 / remaining)
    return network_graph


def find_reroute(graph: nx.DiGraph, source: str, target: str) -> list[str] | None:
    """Shortest live path between two servers, weighted by inverse remaining
    network_link capacity. None if no live path exists.
    """
    network_graph = live_network_graph(graph)
    if source not in network_graph or target not in network_graph:
        return None
    try:
        return nx.dijkstra_path(network_graph, source, target, weight="weight")
    except nx.NetworkXNoPath:
        return None
