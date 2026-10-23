from paladin_sim.agents.athena.thermal_limits import check_thermal_limits
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, project_one_tick


def test_thermal_limits_passes_for_a_healthy_migration() -> None:
    state = SimulationState(graph=build_sample_topology().graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 10.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_thermal_limits(projected, fix)

    assert passed
    assert reason is None
