"""The station graph: PALADIN-Station's live power, coolant, and network topology."""

from dataclasses import dataclass, field
from typing import Literal

import networkx as nx

NodeType = Literal["server", "power_bus", "thermal_zone", "transformer", "battery", "radiator"]
EdgeType = Literal["power_line", "coolant_line", "network_link"]
NodeStatus = Literal["nominal", "degraded", "critical", "offline"]
EdgeStatus = Literal["nominal", "congested", "severed"]


@dataclass
class StationGraph:
    """Nodes and edges conforming to docs/schemas/telemetry.schema.json.

    Directed: power and coolant edges point the way their flow actually runs.
    network_link direction is nominal, not physically meaningful, routing
    (#13) should treat the network subgraph as undirected for path-finding.
    """

    graph: nx.DiGraph = field(default_factory=nx.DiGraph)

    def add_node(
        self,
        node_id: str,
        node_type: NodeType,
        x: float,
        y: float,
        status: NodeStatus = "nominal",
        **metrics: float,
    ) -> None:
        self.graph.add_node(node_id, type=node_type, x=x, y=y, status=status, metrics=dict(metrics))

    def add_edge(
        self,
        edge_id: str,
        edge_type: EdgeType,
        from_id: str,
        to_id: str,
        status: EdgeStatus = "nominal",
        capacity: float | None = None,
        current_flow: float | None = None,
    ) -> None:
        self.graph.add_edge(
            from_id,
            to_id,
            id=edge_id,
            type=edge_type,
            status=status,
            capacity=capacity,
            current_flow=current_flow,
        )

    def snapshot(self, tick: int, timestamp: str, active_faults: list[dict] | None = None) -> dict:
        """Serialise current state into a telemetry.schema.json-conformant snapshot."""
        nodes = [
            {
                "id": node_id,
                "type": data["type"],
                "position": {"x": data["x"], "y": data["y"]},
                "status": data["status"],
                "metrics": dict(data["metrics"]),
            }
            for node_id, data in self.graph.nodes(data=True)
        ]

        edges = []
        for from_id, to_id, data in self.graph.edges(data=True):
            edge = {
                "id": data["id"],
                "type": data["type"],
                "from": from_id,
                "to": to_id,
                "status": data["status"],
            }
            if data["capacity"] is not None:
                edge["capacity"] = data["capacity"]
            if data["current_flow"] is not None:
                edge["currentFlow"] = data["current_flow"]
            edges.append(edge)

        return {
            "tick": tick,
            "timestamp": timestamp,
            "activeFaults": active_faults or [],
            "nodes": nodes,
            "edges": edges,
        }


def build_sample_topology() -> StationGraph:
    """A small, representative station for development and testing.

    One battery buffering one bus through a transformer into three servers,
    split across two thermal zones feeding one radiator, plus a network mesh
    between the servers.
    """
    station = StationGraph()

    station.add_node("BATT-1", "battery", 80, 300, batteryChargePercent=100.0)
    station.add_node("BUS-A", "power_bus", 220, 300, powerLoadPercent=40.0)
    station.add_node("TRANSFORMER-1", "transformer", 320, 300, powerLoadPercent=40.0)
    station.add_node("SRV-01", "server", 440, 160, powerLoadPercent=50.0, temperatureCelsius=35.0, networkUtilisationPercent=20.0)
    station.add_node("SRV-02", "server", 440, 300, powerLoadPercent=50.0, temperatureCelsius=35.0, networkUtilisationPercent=20.0)
    station.add_node("SRV-03", "server", 440, 440, powerLoadPercent=50.0, temperatureCelsius=35.0, networkUtilisationPercent=20.0)
    station.add_node("THERM-N", "thermal_zone", 620, 230, temperatureCelsius=22.0, coolantFlowRate=5.0)
    station.add_node("THERM-S", "thermal_zone", 620, 430, temperatureCelsius=22.0, coolantFlowRate=5.0)
    station.add_node("RAD-1", "radiator", 780, 230, coolantFlowRate=5.0)
    station.add_node("BUS-B", "power_bus", 780, 430, powerLoadPercent=15.0)

    station.add_edge("E-BATT-BUSA", "power_line", "BATT-1", "BUS-A", capacity=100.0, current_flow=40.0)
    station.add_edge("E-BUSA-XFMR", "power_line", "BUS-A", "TRANSFORMER-1", capacity=100.0, current_flow=40.0)
    station.add_edge("E-XFMR-SRV01", "power_line", "TRANSFORMER-1", "SRV-01", capacity=50.0, current_flow=25.0)
    station.add_edge("E-XFMR-SRV02", "power_line", "TRANSFORMER-1", "SRV-02", capacity=50.0, current_flow=25.0)
    station.add_edge("E-XFMR-SRV03", "power_line", "TRANSFORMER-1", "SRV-03", capacity=50.0, current_flow=25.0)
    station.add_edge("E-BUSB-RAD1", "power_line", "BUS-B", "RAD-1", capacity=20.0, current_flow=5.0)

    station.add_edge("E-SRV01-THERMN", "coolant_line", "SRV-01", "THERM-N", capacity=10.0, current_flow=5.0)
    station.add_edge("E-SRV02-THERMN", "coolant_line", "SRV-02", "THERM-N", capacity=10.0, current_flow=5.0)
    station.add_edge("E-SRV03-THERMS", "coolant_line", "SRV-03", "THERM-S", capacity=10.0, current_flow=5.0)
    station.add_edge("E-THERMN-RAD1", "coolant_line", "THERM-N", "RAD-1", capacity=10.0, current_flow=5.0)
    station.add_edge("E-THERMS-RAD1", "coolant_line", "THERM-S", "RAD-1", capacity=10.0, current_flow=2.5)

    station.add_edge("E-SRV01-SRV02", "network_link", "SRV-01", "SRV-02", capacity=1000.0, current_flow=100.0)
    station.add_edge("E-SRV02-SRV03", "network_link", "SRV-02", "SRV-03", capacity=1000.0, current_flow=100.0)
    station.add_edge("E-SRV01-SRV03", "network_link", "SRV-01", "SRV-03", capacity=1000.0, current_flow=100.0)

    return station
