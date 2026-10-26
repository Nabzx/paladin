import json
from pathlib import Path

import jsonschema

from paladin_sim.api.messages import fault_to_alert_payload, make_message, telemetry_snapshot
from paladin_sim.engine.faults import inject_cooling_breach
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState

PROTOCOL_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "agent-protocol.schema.json"
TELEMETRY_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "telemetry.schema.json"


def test_make_message_matches_the_envelope_schema() -> None:
    schema = json.loads(PROTOCOL_SCHEMA_PATH.read_text())
    message = make_message("orion", "commit", {"proposalId": "P-1"})

    jsonschema.Draft202012Validator(schema).validate(message)


def test_fault_to_alert_payload_maps_field_names_and_matches_schema() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")

    payload = fault_to_alert_payload(fault)

    assert payload["faultId"] == "F-1"
    assert payload["faultType"] == "cooling_breach"

    schema = json.loads(PROTOCOL_SCHEMA_PATH.read_text())
    payload_schema = {**schema["$defs"]["faultAlertPayload"], "$schema": schema["$schema"]}
    jsonschema.Draft202012Validator(payload_schema).validate(payload)


def test_telemetry_snapshot_matches_schema() -> None:
    state = SimulationState(graph=build_sample_topology().graph)

    snapshot = telemetry_snapshot(state)

    schema = json.loads(TELEMETRY_SCHEMA_PATH.read_text())
    jsonschema.Draft202012Validator(schema).validate(snapshot)
