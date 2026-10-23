"""Electrical load balance for TESLA, per ADR-0002."""

import networkx as nx

DEGRADED_THRESHOLD = 85.0
CRITICAL_THRESHOLD = 100.0
DEFAULT_DISCHARGE_RATE = 5.0


def _power_line_predecessors(graph: nx.DiGraph, node_id: str) -> list[tuple[str, dict]]:
    return [
        (u, data)
        for u, _, data in graph.in_edges(node_id, data=True)
        if data["type"] == "power_line"
    ]


def _effective_capacity(data: dict) -> float:
    if data["status"] == "severed":
        return 0.0
    capacity = data["capacity"] or 0.0
    return capacity * 0.5 if data["status"] == "congested" else capacity


def _feeding_capacity(graph: nx.DiGraph, server_id: str) -> float:
    predecessors = _power_line_predecessors(graph, server_id)
    return predecessors[0][1]["capacity"] or 0.0 if predecessors else 0.0


def _downstream_demand(graph: nx.DiGraph, node_id: str, cache: dict[str, float]) -> float:
    """Total demand drawn through node_id, ignoring anything beyond a severed edge."""
    if node_id in cache:
        return cache[node_id]

    if graph.nodes[node_id]["type"] == "server":
        metrics = graph.nodes[node_id]["metrics"]
        demand = metrics["powerLoadPercent"] / 100 * _feeding_capacity(graph, node_id)
        cache[node_id] = demand
        return demand

    total = 0.0
    for _, child_id, data in graph.out_edges(node_id, data=True):
        if data["type"] == "power_line" and data["status"] != "severed":
            total += _downstream_demand(graph, child_id, cache)
    cache[node_id] = total
    return total


def _find_reachable_battery(graph: nx.DiGraph, server_id: str) -> str | None:
    """Any battery reachable from the server over live power_line edges."""
    frontier = [server_id]
    seen = set()
    while frontier:
        current = frontier.pop()
        if current in seen:
            continue
        seen.add(current)
        if graph.nodes[current]["type"] == "battery":
            return current
        for upstream_id, data in _power_line_predecessors(graph, current):
            if data["status"] != "severed":
                frontier.append(upstream_id)
    return None


def _update_status(node_data: dict, power_load_percent: float) -> None:
    if power_load_percent >= CRITICAL_THRESHOLD:
        node_data["status"] = "critical"
    elif power_load_percent >= DEGRADED_THRESHOLD:
        node_data["status"] = "degraded"
    else:
        node_data["status"] = "nominal"


def step_electrical(graph: nx.DiGraph, discharge_rate: float = DEFAULT_DISCHARGE_RATE) -> None:
    """Balance every server's demand against the supply actually available to it.

    A shared upstream link rations itself proportionally across everything
    downstream of it, a congested link doesn't just cap the one server that
    happens to be checked first. Each server's available ratio is the
    smallest capacity-to-demand ratio along its whole path back to a power
    root. A deficit draws from the nearest reachable battery before it
    raises the server's own powerLoadPercent.
    """
    demand_cache: dict[str, float] = {}
    availability: dict[str, float] = {}

    roots = [n for n, d in graph.nodes(data=True) if d["type"] != "server" and not _power_line_predecessors(graph, n)]

    def propagate(node_id: str, inherited_ratio: float) -> None:
        for _, child_id, data in graph.out_edges(node_id, data=True):
            if data["type"] != "power_line":
                continue
            child_demand = _downstream_demand(graph, child_id, demand_cache)
            edge_ratio = 1.0 if child_demand == 0 else min(1.0, _effective_capacity(data) / child_demand)
            combined_ratio = min(inherited_ratio, edge_ratio)
            if graph.nodes[child_id]["type"] == "server":
                availability[child_id] = combined_ratio
            else:
                propagate(child_id, combined_ratio)

    for root in roots:
        propagate(root, 1.0)

    for server_id, ratio in availability.items():
        metrics = graph.nodes[server_id]["metrics"]
        demand = demand_cache[server_id]
        supply = demand * ratio

        if demand <= supply + 1e-9:
            _update_status(graph.nodes[server_id], metrics["powerLoadPercent"])
            continue

        deficit = demand - supply
        battery_id = _find_reachable_battery(graph, server_id)
        if battery_id is not None:
            battery_metrics = graph.nodes[battery_id]["metrics"]
            drawn = min(deficit, discharge_rate, battery_metrics["batteryChargePercent"])
            battery_metrics["batteryChargePercent"] -= drawn
            deficit -= drawn

        feeding_capacity = _feeding_capacity(graph, server_id)
        if deficit > 0 and feeding_capacity > 0:
            metrics["powerLoadPercent"] = min(100.0, metrics["powerLoadPercent"] + (deficit / feeding_capacity) * 100)

        _update_status(graph.nodes[server_id], metrics["powerLoadPercent"])
