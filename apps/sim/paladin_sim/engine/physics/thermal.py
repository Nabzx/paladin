"""Thermal diffusion for VULCAN, per ADR-0002."""

import networkx as nx

K_THERMAL = 0.05
HEAT_PER_LOAD_PERCENT = 0.05
COOLING_COEFFICIENT = 1.0


def _coolant_neighbours(graph: nx.DiGraph, node_id: str) -> list[tuple[str, str, dict]]:
    """Live coolant_line neighbours of a node, tagged 'in' or 'out'."""
    neighbours = []
    for u, _, data in graph.in_edges(node_id, data=True):
        if data["type"] == "coolant_line" and data["status"] != "severed":
            neighbours.append((u, "in", data))
    for _, v, data in graph.out_edges(node_id, data=True):
        if data["type"] == "coolant_line" and data["status"] != "severed":
            neighbours.append((v, "out", data))
    return neighbours


def step_thermal(graph: nx.DiGraph, dt: float = 1.0) -> None:
    """Advance every thermal_zone's temperature by one tick.

    Heat generated: from server neighbours feeding in, proportional to their
    powerLoadPercent. Cooling: from a radiator neighbour, proportional to the
    feeding edge's currentFlow. Diffusion: from any thermal_zone neighbour,
    proportional to the temperature difference (none in the sample topology
    today, supported for when a future one adds zone-to-zone coolant lines).

    All zones are updated from a single snapshot of the current state, so a
    zone's own change this tick never affects another zone's result this
    same tick.
    """
    thermal_zones = [n for n, d in graph.nodes(data=True) if d["type"] == "thermal_zone"]
    temperatures = {n: graph.nodes[n]["metrics"]["temperatureCelsius"] for n in thermal_zones}

    deltas = {}
    for zone_id in thermal_zones:
        heat_generated = 0.0
        cooling = 0.0
        diffusion = 0.0

        for neighbour_id, _direction, data in _coolant_neighbours(graph, zone_id):
            neighbour_type = graph.nodes[neighbour_id]["type"]
            if neighbour_type == "server":
                heat_generated += graph.nodes[neighbour_id]["metrics"]["powerLoadPercent"] * HEAT_PER_LOAD_PERCENT
            elif neighbour_type == "radiator":
                cooling += (data["current_flow"] or 0.0) * COOLING_COEFFICIENT
            elif neighbour_type == "thermal_zone":
                diffusion += K_THERMAL * (temperatures[neighbour_id] - temperatures[zone_id])

        deltas[zone_id] = dt * (diffusion + heat_generated - cooling)

    for zone_id, delta in deltas.items():
        graph.nodes[zone_id]["metrics"]["temperatureCelsius"] += delta
