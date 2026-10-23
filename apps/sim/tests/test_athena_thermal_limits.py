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


def test_thermal_limits_fails_when_zone_overheats() -> None:
    graph = build_sample_topology().graph
    graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] = 88.0
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0
    graph.nodes["SRV-02"]["metrics"]["powerLoadPercent"] = 90.0
    state = SimulationState(graph=graph)
    fix = {"action": "reroute_circuit", "targetNodeIds": ["SRV-01"]}

    projected = project_one_tick(state, fix)
    passed, reason = check_thermal_limits(projected, fix)

    assert not passed
    assert "THERM-N" in reason


def test_thermal_limits_ignores_an_unrelated_overheated_zone() -> None:
    graph = build_sample_topology().graph
    graph.nodes["THERM-S"]["metrics"]["temperatureCelsius"] = 95.0
    state = SimulationState(graph=graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 10.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_thermal_limits(projected, fix)

    assert passed
    assert reason is None


def test_thermal_limits_checks_a_directly_targeted_zone() -> None:
    graph = build_sample_topology().graph
    graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] = 95.0
    state = SimulationState(graph=graph)
    fix = {"action": "reroute_circuit", "targetNodeIds": ["THERM-N"]}

    projected = project_one_tick(state, fix)
    passed, reason = check_thermal_limits(projected, fix)

    assert not passed
    assert "THERM-N" in reason


def test_thermal_limits_reports_every_overheated_zone() -> None:
    graph = build_sample_topology().graph
    graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] = 95.0
    graph.nodes["THERM-S"]["metrics"]["temperatureCelsius"] = 95.0
    state = SimulationState(graph=graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-03"], "loadDelta": 10.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_thermal_limits(projected, fix)

    assert not passed
    assert "THERM-N" in reason
    assert "THERM-S" in reason
