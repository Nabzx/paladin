from paladin_sim.agents.athena.checker import check_fix
from paladin_sim.engine.faults import inject_cooling_breach
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState


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
