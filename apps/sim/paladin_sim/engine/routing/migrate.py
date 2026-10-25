"""Workload migration for MERCURY, per ADR-0003."""

import networkx as nx

from paladin_sim.engine.routing.reroute import live_network_graph

SAFE_LOAD_THRESHOLD = 85.0


def find_migration_target(
    graph: nx.DiGraph,
    source_server_id: str,
    workload_load: float,
    dependency_ids: list[str] | None = None,
    excluded_target_ids: set[str] | None = None,
) -> str | None:
    """Greedy best-fit: the server with the least spare capacity that still
    fits the workload and keeps every dependency live-reachable.

    Best-fit means the tightest sufficient fit, not the roomiest one, that's
    what the term means in bin packing, and it avoids piling every migration
    onto whichever server happens to be emptiest. None if nothing qualifies.

    excluded_target_ids lets a caller rule out a candidate already tried and
    rejected (by ATHENA, say), without re-deriving the whole candidate set
    itself.
    """
    dependency_ids = dependency_ids or []
    excluded_target_ids = excluded_target_ids or set()
    network_graph = live_network_graph(graph)

    candidates: list[tuple[float, str]] = []
    for node_id, data in graph.nodes(data=True):
        if data["type"] != "server" or node_id == source_server_id or node_id in excluded_target_ids:
            continue

        projected_load = data["metrics"]["powerLoadPercent"] + workload_load
        if projected_load > SAFE_LOAD_THRESHOLD:
            continue

        if node_id not in network_graph:
            continue
        if any(
            dependency_id not in network_graph or not nx.has_path(network_graph, node_id, dependency_id)
            for dependency_id in dependency_ids
        ):
            continue

        spare_capacity = 100.0 - data["metrics"]["powerLoadPercent"]
        candidates.append((spare_capacity, node_id))

    if not candidates:
        return None

    candidates.sort(key=lambda candidate: candidate[0])
    return candidates[0][1]
