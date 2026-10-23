"""Fault injection: the three anomalies PALADIN-Station can suffer."""

import networkx as nx

SOLAR_FLARE_LOAD_SPIKE = 30.0


def inject_solar_flare(graph: nx.DiGraph, fault_id: str, node_id: str, severity: str = "p2") -> dict:
    """An electromagnetic surge: spikes a node's own state, no edge severed.

    Raises a server's powerLoadPercent or drains a battery's charge,
    whichever metric the node actually has.
    """
    metrics = graph.nodes[node_id]["metrics"]
    if "powerLoadPercent" in metrics:
        metrics["powerLoadPercent"] = min(100.0, metrics["powerLoadPercent"] + SOLAR_FLARE_LOAD_SPIKE)
    elif "batteryChargePercent" in metrics:
        metrics["batteryChargePercent"] = max(0.0, metrics["batteryChargePercent"] - SOLAR_FLARE_LOAD_SPIKE)

    return {
        "id": fault_id,
        "type": "solar_flare",
        "affectedNodeIds": [node_id],
        "severity": severity,
    }


def inject_micrometeoroid_puncture(graph: nx.DiGraph, fault_id: str, from_id: str, to_id: str, severity: str = "p2") -> dict:
    """A hull puncture: severs a specific power_line or network_link edge."""
    edge_data = graph.edges[from_id, to_id]
    if edge_data["type"] not in {"power_line", "network_link"}:
        raise ValueError(f"micrometeoroid_puncture targets a power_line or network_link, got {edge_data['type']}")

    edge_data["status"] = "severed"

    return {
        "id": fault_id,
        "type": "micrometeoroid_puncture",
        "affectedNodeIds": [from_id, to_id],
        "affectedEdgeIds": [edge_data["id"]],
        "severity": severity,
    }


def inject_cooling_breach(graph: nx.DiGraph, fault_id: str, from_id: str, to_id: str, severity: str = "p2") -> dict:
    """A containment breach: severs a specific coolant_line edge."""
    edge_data = graph.edges[from_id, to_id]
    if edge_data["type"] != "coolant_line":
        raise ValueError(f"cooling_breach targets a coolant_line, got {edge_data['type']}")

    edge_data["status"] = "severed"
    affected_nodes = [n for n in (from_id, to_id) if graph.nodes[n]["type"] == "thermal_zone"]

    return {
        "id": fault_id,
        "type": "cooling_breach",
        "affectedNodeIds": affected_nodes,
        "affectedEdgeIds": [edge_data["id"]],
        "severity": severity,
    }
