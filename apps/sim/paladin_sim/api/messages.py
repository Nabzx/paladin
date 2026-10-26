"""Builds agent-protocol.schema.json-conformant message envelopes."""

import uuid
from datetime import UTC, datetime

from paladin_sim.engine.grid import StationGraph
from paladin_sim.sim_loop import SimulationState


def make_message(from_agent: str, message_type: str, payload: dict) -> dict:
    return {
        "messageId": str(uuid.uuid4()),
        "timestamp": datetime.now(UTC).isoformat(),
        "from": from_agent,
        "type": message_type,
        "payload": payload,
    }


def fault_to_alert_payload(fault: dict) -> dict:
    """faultAlertPayload's field names don't match the fault record's own
    (faultId/faultType vs id/type), this is an explicit mapping, not a
    pass-through."""
    payload = {
        "faultId": fault["id"],
        "faultType": fault["type"],
        "affectedNodeIds": fault.get("affectedNodeIds", []),
        "severity": fault["severity"],
    }
    if fault.get("affectedEdgeIds"):
        payload["affectedEdgeIds"] = fault["affectedEdgeIds"]
    return payload


def telemetry_snapshot(state: SimulationState) -> dict:
    """A telemetry.schema.json-conformant snapshot of the current state.

    StationGraph.snapshot() only reads graph data, state.graph is a bare
    nx.DiGraph, so wrapping it is enough, no refactor needed.
    """
    return StationGraph(graph=state.graph).snapshot(
        tick=state.tick,
        timestamp=datetime.now(UTC).isoformat(),
        active_faults=state.active_faults,
    )
