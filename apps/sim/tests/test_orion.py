from paladin_sim.agents import orion
from paladin_sim.engine.faults import inject_cooling_breach, inject_solar_flare
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState


def test_orion_commits_a_fix_for_a_cooling_breach() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")
    baseline_srv01_load = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]
    state = SimulationState(graph=graph)

    message = orion.respond_to_fault(state, fault)

    assert message["type"] == "commit"
    assert state.graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] != baseline_srv01_load


def test_orion_rolls_back_when_nothing_is_diagnosable() -> None:
    graph = build_sample_topology().graph
    fault = inject_solar_flare(graph, "F-2", "BATT-1")
    state = SimulationState(graph=graph)

    message = orion.respond_to_fault(state, fault)

    assert message["type"] == "rollback"
    assert message["payload"]["reason"]
