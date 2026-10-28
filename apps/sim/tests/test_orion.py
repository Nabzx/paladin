import json
from pathlib import Path

import jsonschema

from paladin_sim.agents import orion
from paladin_sim.engine.faults import inject_cooling_breach, inject_micrometeoroid_puncture, inject_solar_flare
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState

PROTOCOL_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "agent-protocol.schema.json"


def _payload_validator(def_name: str) -> jsonschema.Draft202012Validator:
    schema = json.loads(PROTOCOL_SCHEMA_PATH.read_text())
    payload_schema = {**schema["$defs"][def_name], "$schema": schema["$schema"]}
    return jsonschema.Draft202012Validator(payload_schema)


def test_orion_commits_a_fix_for_a_cooling_breach() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")
    baseline_srv01_load = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]
    state = SimulationState(graph=graph)

    trace = orion.respond_to_fault(state, fault)

    assert trace[-1]["type"] == "commit"
    assert state.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] != baseline_srv01_load
    _payload_validator("commitPayload").validate(trace[-1]["payload"])


def test_orion_rolls_back_when_nothing_is_diagnosable() -> None:
    graph = build_sample_topology().graph
    fault = inject_solar_flare(graph, "F-2", "BATT-1")
    state = SimulationState(graph=graph)

    trace = orion.respond_to_fault(state, fault)

    assert trace[-1]["type"] == "rollback"
    assert trace[-1]["payload"]["reason"]
    _payload_validator("rollbackPayload").validate(trace[-1]["payload"])


def test_orion_reroutes_around_a_severed_network_link() -> None:
    graph = build_sample_topology().graph
    fault = inject_micrometeoroid_puncture(graph, "F-3", "SRV-01", "SRV-02")
    state = SimulationState(graph=graph)

    trace = orion.respond_to_fault(state, fault)

    assert trace[-1]["type"] == "commit"
    # Proves the reroute itself was accepted, not a migration fallback:
    # a migration would have moved load off SRV-01 or SRV-02.
    assert state.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] == 50.0
    assert state.graph.nodes["SRV-02"]["metrics"]["powerLoadPercent"] == 50.0


def test_orion_trace_starts_with_diagnosis_status_broadcasts() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-4", "THERM-N", "RAD-1")
    state = SimulationState(graph=graph)

    trace = orion.respond_to_fault(state, fault)

    status_broadcasts = [msg for msg in trace if msg["type"] == "status_broadcast"]
    assert {msg["from"] for msg in status_broadcasts} >= {"orion", "tesla", "vulcan", "mercury", "athena"}
    assert trace[0]["from"] == "orion"
    assert trace[0]["type"] == "status_broadcast"
    for msg in status_broadcasts:
        _payload_validator("statusBroadcastPayload").validate(msg["payload"])


def test_orion_retries_after_athena_rejects_the_first_proposal() -> None:
    graph = build_sample_topology().graph
    graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] = 89.0
    fault = inject_solar_flare(graph, "F-5", "SRV-01")
    state = SimulationState(graph=graph)

    trace = orion.respond_to_fault(state, fault)

    assert trace[-1]["type"] == "commit"

    proposals = [msg for msg in trace if msg["type"] == "fix_proposal"]
    results = [msg for msg in trace if msg["type"] == "validation_result"]
    assert len(proposals) == 2
    assert len(results) == 2
    # Two distinct attempts, not the same proposal validated twice.
    assert proposals[0]["payload"]["proposalId"] != proposals[1]["payload"]["proposalId"]
    assert proposals[0]["payload"]["targetNodeIds"] == ["SRV-02"]
    assert proposals[1]["payload"]["targetNodeIds"] == ["SRV-03"]
    assert results[0]["payload"]["verdict"] == "fail"
    assert "thermal_limits" in results[0]["payload"]["violatedConstraints"]
    assert results[1]["payload"]["verdict"] == "pass"

    # The committed proposal is the one that actually passed.
    assert trace[-1]["payload"]["proposalId"] == proposals[1]["payload"]["proposalId"]
