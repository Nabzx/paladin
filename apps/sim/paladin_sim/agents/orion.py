"""ORION: Command Orchestrator.

Coordinates VULCAN's and TESLA's diagnosis, asks MERCURY for a fix,
submits it to ATHENA, and turns her verdict into a commit or rollback.
ORION never validates a proposal itself, see CONTEXT.md, the "handshake"
is acting on ATHENA's verdict, not a second check.
"""

import itertools

from paladin_sim.agents import mercury, tesla, vulcan
from paladin_sim.agents.athena.checker import check_fix
from paladin_sim.sim_loop import SimulationState, apply_fix

MAX_ATTEMPTS_PER_SOURCE = 3

_proposal_ids = itertools.count(1)


def _next_proposal_id() -> str:
    return f"P-{next(_proposal_ids)}"


def _diagnose_at_risk_servers(state: SimulationState, fault: dict) -> list[str]:
    at_risk = set(tesla.diagnose_overloaded_servers(state, fault))
    for zone_id in vulcan.diagnose_overheating_zones(state, fault):
        at_risk.update(vulcan.servers_feeding(state, zone_id))
    return sorted(at_risk)


def _try_network_reroute(state: SimulationState, fault: dict, proposal_id: str) -> dict | None:
    affected = fault.get("affectedNodeIds", [])
    if fault.get("affectedEdgeIds") and len(affected) == 2:
        fix = mercury.propose_reroute(state, fault, affected[0], affected[1], proposal_id)
        if fix is not None:
            return fix
    return None


def respond_to_fault(state: SimulationState, fault: dict) -> dict:
    """Diagnose, propose, validate, and commit or roll back, for one fault.

    Returns a commit or rollback message: {"type": ..., "payload": ...},
    payload matching agent-protocol.schema.json's commitPayload or
    rollbackPayload. Mutates state in place on commit, leaves it untouched
    on rollback.
    """
    proposal_id = _next_proposal_id()

    network_fix = _try_network_reroute(state, fault, proposal_id)
    if network_fix is not None:
        result = check_fix(network_fix, fault, state)
        if result["verdict"] == "pass":
            apply_fix(state.graph, network_fix)
            return {"type": "commit", "payload": {"proposalId": proposal_id}}

    at_risk_servers = _diagnose_at_risk_servers(state, fault)
    for source_id in at_risk_servers:
        excluded: set[str] = set()
        for _ in range(MAX_ATTEMPTS_PER_SOURCE):
            fix = mercury.propose_migration(state, fault, source_id, proposal_id, excluded_target_ids=excluded)
            if fix is None:
                break

            result = check_fix(fix, fault, state)
            if result["verdict"] == "pass":
                apply_fix(state.graph, fix)
                return {"type": "commit", "payload": {"proposalId": proposal_id}}

            excluded.add(fix["targetNodeIds"][0])

    return {
        "type": "rollback",
        "payload": {"proposalId": proposal_id, "reason": "no candidate fix satisfied athena"},
    }
