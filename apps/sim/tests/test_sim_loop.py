import json
from pathlib import Path

import jsonschema
import pytest

from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, advance_tick, apply_fix, project_one_tick

PROTOCOL_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "agent-protocol.schema.json"


def _fresh_state() -> SimulationState:
    return SimulationState(graph=build_sample_topology().graph)


def test_advance_tick_increments_the_tick_counter() -> None:
    state = _fresh_state()
    advance_tick(state)
    assert state.tick == 1


def test_advance_tick_is_deterministic() -> None:
    state_a = _fresh_state()
    state_b = _fresh_state()

    advance_tick(state_a)
    advance_tick(state_b)

    temp_a = state_a.graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"]
    temp_b = state_b.graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"]
    assert temp_a == temp_b


def test_apply_fix_migrate_workload_moves_load() -> None:
    graph = build_sample_topology().graph
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 80.0

    apply_fix(
        graph,
        {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 30.0},
    )

    assert graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] == 50.0
    assert graph.nodes["SRV-02"]["metrics"]["powerLoadPercent"] == 80.0


def test_apply_fix_reroute_circuit_is_a_safe_noop() -> None:
    graph = build_sample_topology().graph
    baseline = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]

    apply_fix(graph, {"action": "reroute_circuit", "targetNodeIds": ["SRV-01", "SRV-03", "SRV-02"]})

    assert graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] == baseline


def test_apply_fix_rejects_an_unimplemented_action() -> None:
    graph = build_sample_topology().graph
    with pytest.raises(ValueError):
        apply_fix(graph, {"action": "open_coolant_valve", "targetNodeIds": ["THERM-N"]})


def test_project_one_tick_never_mutates_the_real_state() -> None:
    state = _fresh_state()
    baseline_tick = state.tick
    baseline_load = state.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]

    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 20.0}
    projected = project_one_tick(state, fix)

    assert state.tick == baseline_tick
    assert state.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] == baseline_load
    assert projected.tick == baseline_tick + 1
    assert projected.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] < baseline_load


def test_migrate_workload_fix_matches_protocol_schema() -> None:
    schema = json.loads(PROTOCOL_SCHEMA_PATH.read_text())
    payload_schema = {**schema["$defs"]["fixProposalPayload"], "$schema": schema["$schema"]}
    validator = jsonschema.Draft202012Validator(payload_schema)

    fix = {
        "proposalId": "P-1",
        "faultId": "F-1",
        "action": "migrate_workload",
        "sourceNodeId": "SRV-01",
        "targetNodeIds": ["SRV-02"],
        "loadDelta": 20.0,
    }
    validator.validate(fix)
