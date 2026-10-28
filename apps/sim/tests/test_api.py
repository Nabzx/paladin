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
    # Wide enough for the full intermediate trace (status_broadcast per
    # diagnosis/proposal/validation step, several retries possible), not
    # just the first and last message, see #86.
    MAX_MESSAGES = 30

    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        websocket.receive_json()  # the initial snapshot on connect

        response = client.post("/faults", json={"type": "cooling_breach", "from_id": "THERM-N", "to_id": "RAD-1"})
        assert response.status_code == 200

        received_types = set()
        for _ in range(MAX_MESSAGES):
            message = websocket.receive_json()
            jsonschema.Draft202012Validator(ENVELOPE_SCHEMA).validate(message)
            received_types.add(message["type"])
            if "fault_alert" in received_types and received_types & {"commit", "rollback"}:
                break

    assert "fault_alert" in received_types
    assert received_types & {"commit", "rollback"}


def _wait_for_snapshot(websocket, max_messages: int = 30) -> dict:
    for _ in range(max_messages):  # wide enough for the full intermediate trace, see #86
        message = websocket.receive_json()
        if "nodes" in message:
            return message
    raise AssertionError("no snapshot received")


def test_an_unresolved_fault_stays_in_active_faults() -> None:
    # No viable migration target exists for a battery, see
    # test_orion_rolls_back_when_nothing_is_diagnosable, so this always
    # rolls back, the fault is still live.
    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        websocket.receive_json()  # the initial snapshot on connect

        response = client.post("/faults", json={"type": "solar_flare", "node_id": "BATT-1"})
        fault_id = response.json()["fault"]["id"]

        snapshot = _wait_for_snapshot(websocket)

    active_fault_ids = [fault["id"] for fault in snapshot["activeFaults"]]
    assert fault_id in active_fault_ids


def test_a_resolved_fault_is_cleared_from_active_faults() -> None:
    # Found while building #62's HUD: active_faults was append-only,
    # never cleared, so an "active fault count" would only ever grow
    # regardless of what ORION actually fixed.
    with TestClient(app) as client, client.websocket_connect("/ws") as websocket:
        websocket.receive_json()  # the initial snapshot on connect

        response = client.post(
            "/faults", json={"type": "micrometeoroid_puncture", "from_id": "SRV-01", "to_id": "SRV-02"}
        )
        assert response.json()["result"]["type"] == "commit"
        fault_id = response.json()["fault"]["id"]

        snapshot = _wait_for_snapshot(websocket)

    active_fault_ids = [fault["id"] for fault in snapshot["activeFaults"]]
    assert fault_id not in active_fault_ids


def test_fault_severity_can_be_overridden_in_the_request() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/faults",
            json={"type": "solar_flare", "node_id": "SRV-01", "severity": "p1"},
        )

    assert response.status_code == 200
    assert response.json()["fault"]["severity"] == "p1"
