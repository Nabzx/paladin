import json
from pathlib import Path

import jsonschema
from fastapi.testclient import TestClient

from paladin_sim.api.main import app

PROTOCOL_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "agent-protocol.schema.json"
ENVELOPE_SCHEMA = json.loads(PROTOCOL_SCHEMA_PATH.read_text())


def test_health_still_works() -> None:
    with TestClient(app) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ws_sends_a_telemetry_snapshot_on_connect() -> None:
    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        first_message = websocket.receive_json()

    assert "nodes" in first_message
    assert "edges" in first_message


def test_triggering_a_cooling_breach_broadcasts_fault_alert_and_a_verdict() -> None:
    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        websocket.receive_json()  # the initial snapshot on connect

        response = client.post("/faults", json={"type": "cooling_breach", "from_id": "THERM-N", "to_id": "RAD-1"})
        assert response.status_code == 200

        received_types = set()
        for _ in range(5):
            message = websocket.receive_json()
            jsonschema.Draft202012Validator(ENVELOPE_SCHEMA).validate(message)
            received_types.add(message["type"])
            if "fault_alert" in received_types and received_types & {"commit", "rollback"}:
                break

    assert "fault_alert" in received_types
    assert received_types & {"commit", "rollback"}


def test_triggering_a_fault_appears_in_the_next_snapshots_active_faults() -> None:
    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        websocket.receive_json()  # the initial snapshot on connect

        response = client.post("/faults", json={"type": "cooling_breach", "from_id": "THERM-N", "to_id": "RAD-1"})
        fault_id = response.json()["fault"]["id"]

        snapshot = None
        for _ in range(5):
            message = websocket.receive_json()
            if "nodes" in message:
                snapshot = message
                break

    assert snapshot is not None
    active_fault_ids = [fault["id"] for fault in snapshot["activeFaults"]]
    assert fault_id in active_fault_ids


def test_fault_severity_can_be_overridden_in_the_request() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/faults",
            json={"type": "solar_flare", "node_id": "SRV-01", "severity": "p1"},
        )

    assert response.status_code == 200
    assert response.json()["fault"]["severity"] == "p1"
