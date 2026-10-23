import json
from pathlib import Path

import jsonschema
import pytest

from paladin_sim.engine.faults import inject_cooling_breach, inject_micrometeoroid_puncture, inject_solar_flare
from paladin_sim.engine.grid import build_sample_topology

SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "telemetry.schema.json"


def _fault_validator() -> jsonschema.Draft202012Validator:
    schema = json.loads(SCHEMA_PATH.read_text())
    fault_schema = {**schema["$defs"]["fault"], "$schema": schema["$schema"]}
    return jsonschema.Draft202012Validator(fault_schema)


def test_cooling_breach_severs_the_coolant_line_and_matches_schema() -> None:
    graph = build_sample_topology().graph
    validator = _fault_validator()

    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")

    assert graph.edges["THERM-N", "RAD-1"]["status"] == "severed"
    validator.validate(fault)


def test_cooling_breach_rejects_a_non_coolant_edge() -> None:
    graph = build_sample_topology().graph

    with pytest.raises(ValueError):
        inject_cooling_breach(graph, "F-1", "BATT-1", "BUS-A")


def test_micrometeoroid_puncture_severs_a_power_line_and_matches_schema() -> None:
    graph = build_sample_topology().graph
    validator = _fault_validator()

    fault = inject_micrometeoroid_puncture(graph, "F-2", "TRANSFORMER-1", "SRV-01")

    assert graph.edges["TRANSFORMER-1", "SRV-01"]["status"] == "severed"
    validator.validate(fault)


def test_micrometeoroid_puncture_severs_a_network_link() -> None:
    graph = build_sample_topology().graph

    inject_micrometeoroid_puncture(graph, "F-3", "SRV-01", "SRV-02")

    assert graph.edges["SRV-01", "SRV-02"]["status"] == "severed"


def test_micrometeoroid_puncture_rejects_a_coolant_edge() -> None:
    graph = build_sample_topology().graph

    with pytest.raises(ValueError):
        inject_micrometeoroid_puncture(graph, "F-4", "SRV-01", "THERM-N")


def test_solar_flare_spikes_a_servers_load_and_matches_schema() -> None:
    graph = build_sample_topology().graph
    validator = _fault_validator()
    baseline = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]

    fault = inject_solar_flare(graph, "F-5", "SRV-01")

    assert graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] > baseline
    validator.validate(fault)


def test_solar_flare_drains_a_battery() -> None:
    graph = build_sample_topology().graph
    baseline = graph.nodes["BATT-1"]["metrics"]["batteryChargePercent"]

    inject_solar_flare(graph, "F-6", "BATT-1")

    assert graph.nodes["BATT-1"]["metrics"]["batteryChargePercent"] < baseline
