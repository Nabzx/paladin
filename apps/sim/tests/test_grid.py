import json
from pathlib import Path

import jsonschema

from paladin_sim.engine.grid import build_sample_topology

SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "telemetry.schema.json"


def test_sample_topology_snapshot_matches_schema() -> None:
    schema = json.loads(SCHEMA_PATH.read_text())
    station = build_sample_topology()

    snapshot = station.snapshot(tick=0, timestamp="2026-01-01T00:00:00Z")

    jsonschema.Draft202012Validator(schema).validate(snapshot)


def test_sample_topology_covers_every_node_type() -> None:
    station = build_sample_topology()
    types = {data["type"] for _, data in station.graph.nodes(data=True)}

    assert types == {"server", "power_bus", "thermal_zone", "transformer", "battery", "radiator"}


def test_sample_topology_covers_every_edge_type() -> None:
    station = build_sample_topology()
    types = {data["type"] for _, _, data in station.graph.edges(data=True)}

    assert types == {"power_line", "coolant_line", "network_link"}
