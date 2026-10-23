from paladin_sim.agents.athena.power_balance import check_power_balance
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, project_one_tick


def test_power_balance_passes_for_a_healthy_migration() -> None:
    state = SimulationState(graph=build_sample_topology().graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 20.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_power_balance(projected, fix)

    assert passed
    assert reason is None


def test_power_balance_fails_when_target_overloaded() -> None:
    state = SimulationState(graph=build_sample_topology().graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 90.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_power_balance(projected, fix)

    assert not passed
    assert "SRV-02" in reason


def test_power_balance_ignores_unrelated_critical_nodes() -> None:
    graph = build_sample_topology().graph
    graph.nodes["SRV-03"]["metrics"]["powerLoadPercent"] = 100.0
    graph.nodes["SRV-03"]["status"] = "critical"
    state = SimulationState(graph=graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 20.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_power_balance(projected, fix)

    assert passed
    assert reason is None
