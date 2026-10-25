"""ATHENA's composed checker: all four ADR-0004 constraints, one verdict."""

from paladin_sim.agents.athena.connectivity import check_connectivity
from paladin_sim.agents.athena.no_secondary_cascade import check_no_secondary_cascade
from paladin_sim.agents.athena.power_balance import check_power_balance
from paladin_sim.agents.athena.thermal_limits import check_thermal_limits
from paladin_sim.sim_loop import SimulationState, project_one_tick

STATE_SCOPED_CHECKS = {
    "power_balance": check_power_balance,
    "thermal_limits": check_thermal_limits,
    "connectivity": check_connectivity,
}


def check_fix(fix: dict, fault: dict, pre_state: SimulationState) -> dict:
    """Run every ADR-0004 constraint against a proposed fix, returning a
    validation_result (agent-protocol.schema.json shape).

    Takes the real objects directly rather than a bare validation_request,
    see this issue's research comment: mapping a validation_request's
    proposalId to these is a thin adapter #17 will need, once there's a
    proposal registry to look one up from.

    Runs all four, doesn't stop at the first failure, violatedConstraints
    names every constraint that failed.
    """
    post_state = project_one_tick(pre_state, fix)

    violated = []
    reasons = []

    for name, check in STATE_SCOPED_CHECKS.items():
        passed, reason = check(post_state, fix)
        if not passed:
            violated.append(name)
            reasons.append(reason)

    cascade_passed, cascade_reason = check_no_secondary_cascade(fault, pre_state, post_state)
    if not cascade_passed:
        violated.append("no_secondary_cascade")
        reasons.append(cascade_reason)

    if violated:
        return {
            "proposalId": fix.get("proposalId", ""),
            "verdict": "fail",
            "reasoning": "; ".join(reasons),
            "violatedConstraints": violated,
        }

    return {
        "proposalId": fix.get("proposalId", ""),
        "verdict": "pass",
        "reasoning": "all constraints satisfied",
    }
