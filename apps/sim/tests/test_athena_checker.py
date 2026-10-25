import json
from pathlib import Path

import jsonschema

from paladin_sim.agents.athena.checker import check_fix
from paladin_sim.engine.faults import inject_cooling_breach
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState

PROTOCOL_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "docs" / "schemas" / "agent-protocol.schema.json"


def _result_validator() -> jsonschema.Draft202012Validator:
    schema = json.loads(PROTOCOL_SCHEMA_PATH.read_text())
    result_schema = {**schema["$defs"]["validationResultPayload"], "$schema": schema["$schema"]}
    return jsonschema.Draft202012Validator(result_schema)


def test_check_fix_passes_all_four_constraints() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")
    pre_state = SimulationState(graph=graph)
    fix = {
        "proposalId": "P-1",
        "action": "migrate_workload",
        "sourceNodeId": "SRV-01",
        "targetNodeIds": ["SRV-03"],
        "loadDelta": 40.0,
    }

    result = check_fix(fix, fault, pre_state)

    assert result["verdict"] == "pass"
    assert "violatedConstraints" not in result
    _result_validator().validate(result)


def test_check_fix_reports_every_violated_constraint() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")
    pre_state = SimulationState(graph=graph)
    fix = {
        "proposalId": "P-2",
        "action": "migrate_workload",
        "sourceNodeId": "SRV-01",
        "targetNodeIds": ["SRV-02"],
        "loadDelta": 90.0,
    }

    result = check_fix(fix, fault, pre_state)

    assert result["verdict"] == "fail"
    assert set(result["violatedConstraints"]) == {"power_balance", "no_secondary_cascade"}
    _result_validator().validate(result)
