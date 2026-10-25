from paladin_sim.agents.athena.no_secondary_cascade import check_no_secondary_cascade
from paladin_sim.engine.faults import inject_cooling_breach
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, project_one_tick


def test_no_secondary_cascade_fails_for_a_same_zone_noop_migration() -> None:
    graph = build_sample_topology().graph
    fault = inject_cooling_breach(graph, "F-1", "THERM-N", "RAD-1")
    pre_state = SimulationState(graph=graph)
    fix = {"action": "migrate_workload", "sourceNodeId": "SRV-01", "targetNodeIds": ["SRV-02"], "loadDelta": 20.0}

    post_state = project_one_tick(pre_state, fix)
    passed, reason = check_no_secondary_cascade(fault, pre_state, post_state)

    assert not passed
