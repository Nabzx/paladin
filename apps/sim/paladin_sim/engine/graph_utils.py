"""Small graph helpers shared across physics, routing, and ATHENA's checks."""

import networkx as nx


def effective_capacity(data: dict) -> float:
    if data["status"] == "severed":
        return 0.0
    capacity = data["capacity"] or 0.0
    return capacity * 0.5 if data["status"] == "congested" else capacity


def power_line_predecessors(graph: nx.DiGraph, node_id: str) -> list[tuple[str, dict]]:
    return [
        (u, data)
        for u, _, data in graph.in_edges(node_id, data=True)
        if data["type"] == "power_line"
    ]
