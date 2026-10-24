from paladin_sim.agents.athena.connectivity import check_connectivity
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, project_one_tick


def test_connectivity_passes_for_a_healthy_migration() -> None:
    state = SimulationState(graph=build_sample_topology().graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 10.0}

    projected = project_one_tick(state, fix)
    passed, reason = check_connectivity(projected, fix)

    assert passed
    assert reason is None


def test_connectivity_fails_when_server_loses_power_path() -> None:
    graph = build_sample_topology().graph
    graph.edges["TRANSFORMER-1", "SRV-01"]["status"] = "severed"
    state = SimulationState(graph=graph)
    fix = {"action": "reroute_circuit", "targetNodeIds": ["SRV-01"]}

    projected = project_one_tick(state, fix)
    passed, reason = check_connectivity(projected, fix)

    assert not passed
    assert "SRV-01" in reason
    assert "power path" in reason


def test_connectivity_fails_when_server_isolated_from_network() -> None:
    graph = build_sample_topology().graph
    graph.edges["SRV-01", "SRV-02"]["status"] = "severed"
    graph.edges["SRV-01", "SRV-03"]["status"] = "severed"
    state = SimulationState(graph=graph)
    fix = {"action": "reroute_circuit", "targetNodeIds": ["SRV-01"]}

    projected = project_one_tick(state, fix)
    passed, reason = check_connectivity(projected, fix)

    assert not passed
    assert "SRV-01" in reason
    assert "isolated" in reason
