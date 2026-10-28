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


def _status(from_agent: str, summary: str, node_ids: list[str] | None = None) -> dict:
    payload: dict = {"summary": summary}
    if node_ids:
        payload["nodeIds"] = node_ids
    return {"from": from_agent, "type": "status_broadcast", "payload": payload}


def _propose_and_validate(state: SimulationState, fault: dict, fix: dict, trace: list[dict]) -> dict:
    """Appends fix_proposal, athena's status, validation_request, and
    validation_result to trace for one candidate fix. Returns the
    validation_result payload."""
    trace.append({"from": "mercury", "type": "fix_proposal", "payload": fix})
    trace.append(_status("athena", f"validating proposal {fix['proposalId']}"))
    trace.append({"from": "athena", "type": "validation_request", "payload": {"proposalId": fix["proposalId"]}})
    result = check_fix(fix, fault, state)
    trace.append({"from": "athena", "type": "validation_result", "payload": result})
    return result


def _diagnose_at_risk_servers(state: SimulationState, fault: dict, trace: list[dict]) -> list[str]:
    overloaded = tesla.diagnose_overloaded_servers(state, fault)
    trace.append(
        _status(
            "tesla",
            f"{len(overloaded)} server(s) overloaded" if overloaded else "no overloaded servers",
            overloaded,
        )
    )

    zones = vulcan.diagnose_overheating_zones(state, fault)
    trace.append(
        _status(
            "vulcan",
            f"{len(zones)} thermal zone(s) overheating" if zones else "no overheating zones",
            zones,
        )
    )

    at_risk = set(overloaded)
    for zone_id in zones:
        at_risk.update(vulcan.servers_feeding(state, zone_id))
    return sorted(at_risk)


def _try_network_reroute(state: SimulationState, fault: dict, trace: list[dict]) -> dict | None:
    affected = fault.get("affectedNodeIds", [])
    if not (fault.get("affectedEdgeIds") and len(affected) == 2):
        return None

    trace.append(_status("mercury", f"proposing a network reroute around {affected[0]}-{affected[1]}"))
    fix = mercury.propose_reroute(state, fault, affected[0], affected[1], _next_proposal_id())
    if fix is None:
        trace.append(_status("mercury", "no live alternate path found"))
        return None
    return fix


def respond_to_fault(state: SimulationState, fault: dict) -> list[dict]:
    """Diagnose, propose, validate, and commit or roll back, for one fault.

    Returns the full ordered trace of agent-protocol messages this
    response produces: {"from": ..., "type": ..., "payload": ...} dicts,
    payload matching the sibling type's schema. The last entry is always
    a commit or rollback. Mutates state in place on commit, leaves it
    untouched on rollback.
    """
    trace: list[dict] = []

    network_fix = _try_network_reroute(state, fault, trace)
    if network_fix is not None:
        result = _propose_and_validate(state, fault, network_fix, trace)
        if result["verdict"] == "pass":
            apply_fix(state.graph, network_fix)
            trace.append({"from": "orion", "type": "commit", "payload": {"proposalId": network_fix["proposalId"]}})
            return trace

    last_proposal_id: str | None = None
    at_risk_servers = _diagnose_at_risk_servers(state, fault, trace)
    for source_id in at_risk_servers:
        excluded: set[str] = set()
        for attempt in range(MAX_ATTEMPTS_PER_SOURCE):
            retrying = ", retrying with a new target" if attempt else ""
            trace.append(_status("mercury", f"proposing a workload migration off {source_id}{retrying}"))

            fix = mercury.propose_migration(state, fault, source_id, _next_proposal_id(), excluded_target_ids=excluded)
            if fix is None:
                trace.append(_status("mercury", f"no migration target available for {source_id}"))
                break

            last_proposal_id = fix["proposalId"]
            result = _propose_and_validate(state, fault, fix, trace)
            if result["verdict"] == "pass":
                apply_fix(state.graph, fix)
                trace.append({"from": "orion", "type": "commit", "payload": {"proposalId": fix["proposalId"]}})
                return trace

            excluded.add(fix["targetNodeIds"][0])

    trace.append(
        {
            "from": "orion",
            "type": "rollback",
            "payload": {
                "proposalId": last_proposal_id or _next_proposal_id(),
                "reason": "no candidate fix satisfied athena",
            },
        }
    )
    return trace
