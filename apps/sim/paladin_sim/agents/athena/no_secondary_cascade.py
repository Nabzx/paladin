"""ATHENA's no-secondary-cascade constraint, per ADR-0004 as amended by #10."""

from paladin_sim.sim_loop import SimulationState, project_one_tick

IMPROVING_DIRECTION = {
    "temperatureCelsius": -1,
    "powerLoadPercent": -1,
    "batteryChargePercent": 1,
    "coolantFlowRate": 1,
    "networkUtilisationPercent": -1,
}


def _measurably_better(counterfactual_metrics: dict, actual_metrics: dict) -> bool:
    for metric, direction in IMPROVING_DIRECTION.items():
        if metric in counterfactual_metrics and metric in actual_metrics:
            delta = actual_metrics[metric] - counterfactual_metrics[metric]
            if delta * direction > 1e-9:
                return True
    return False


def check_no_secondary_cascade(
    fault: dict, pre_state: SimulationState, post_state: SimulationState
) -> tuple[bool, str | None]:
    """The fix must do better than doing nothing, not merely no worse than
    before it.

    An active, unrepaired fault keeps getting worse tick over tick whether
    or not a fix is applied, so 'better than before the fix' is the wrong
    bar, see #10's grilling and this issue's research comment. Compares
    post_state against a counterfactual, the same pre_state projected one
    tick with no fix at all, rather than against pre_state directly.

    The improvement bar only applies to nodes that are actually
    deteriorating without intervention (temperature rising, load not
    settling), found via #17: a reroute_circuit fix doesn't change any
    node's own metrics at all, it changes which path future packets take,
    something this engine doesn't track per-node. Requiring improvement
    on a node that was never getting worse in the first place would reject
    every reroute, regardless of whether it genuinely helps.
    """
    counterfactual = project_one_tick(pre_state, None)

    new_criticals = sorted(
        node_id
        for node_id, post_data in post_state.graph.nodes(data=True)
        if post_data["status"] == "critical"
        and counterfactual.graph.nodes.get(node_id, {}).get("status") != "critical"
    )
    if new_criticals:
        return False, f"this fix causes new critical node(s) that wouldn't happen otherwise: {', '.join(new_criticals)}"

    affected_ids = fault.get("affectedNodeIds", [])
    deteriorating_ids = [
        node_id
        for node_id in affected_ids
        if node_id in pre_state.graph.nodes
        and node_id in counterfactual.graph.nodes
        and _measurably_better(
            counterfactual.graph.nodes[node_id]["metrics"],
            pre_state.graph.nodes[node_id]["metrics"],
        )
    ]
    if deteriorating_ids:
        improved = any(
            _measurably_better(
                counterfactual.graph.nodes[node_id]["metrics"],
                post_state.graph.nodes[node_id]["metrics"],
            )
            for node_id in deteriorating_ids
        )
        if not improved:
            return False, f"fix does no better than doing nothing for: {', '.join(deteriorating_ids)}"

    return True, None
