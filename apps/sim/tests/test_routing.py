from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.engine.routing.migrate import find_migration_target
from paladin_sim.engine.routing.reroute import find_reroute


def test_reroute_finds_alternate_path_when_direct_link_severed() -> None:
    graph = build_sample_topology().graph
    graph.edges["SRV-01", "SRV-02"]["status"] = "severed"

    path = find_reroute(graph, "SRV-01", "SRV-02")

    assert path == ["SRV-01", "SRV-03", "SRV-02"]


def test_reroute_returns_none_when_no_live_path_exists() -> None:
    graph = build_sample_topology().graph
    graph.edges["SRV-01", "SRV-02"]["status"] = "severed"
    graph.edges["SRV-01", "SRV-03"]["status"] = "severed"
    graph.edges["SRV-02", "SRV-03"]["status"] = "severed"

    assert find_reroute(graph, "SRV-01", "SRV-02") is None


def test_migration_target_found_for_overloaded_server() -> None:
    graph = build_sample_topology().graph
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0

    target = find_migration_target(graph, "SRV-01", workload_load=20.0)

    assert target in {"SRV-02", "SRV-03"}


def test_migration_target_skips_an_excluded_candidate() -> None:
    graph = build_sample_topology().graph

    target = find_migration_target(graph, "SRV-01", workload_load=20.0, excluded_target_ids={"SRV-02"})

    assert target == "SRV-03"


def test_migration_returns_none_when_no_server_has_headroom() -> None:
    graph = build_sample_topology().graph
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0
    graph.nodes["SRV-02"]["metrics"]["powerLoadPercent"] = 90.0
    graph.nodes["SRV-03"]["metrics"]["powerLoadPercent"] = 90.0

    assert find_migration_target(graph, "SRV-01", workload_load=20.0) is None


def test_migration_respects_dependency_reachability() -> None:
    graph = build_sample_topology().graph
    graph.edges["SRV-02", "SRV-03"]["status"] = "severed"
    graph.edges["SRV-01", "SRV-03"]["status"] = "severed"

    target = find_migration_target(graph, "SRV-01", workload_load=10.0, dependency_ids=["SRV-03"])

    assert target is None
