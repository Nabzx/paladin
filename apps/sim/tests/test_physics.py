from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.engine.physics.electrical import step_electrical
from paladin_sim.engine.physics.thermal import step_thermal


def test_thermal_zone_is_stable_at_nominal_load() -> None:
    graph = build_sample_topology().graph
    baseline = graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"]

    for _ in range(5):
        step_thermal(graph)

    assert abs(graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] - baseline) < 0.5


def test_every_thermal_zone_is_stable_at_nominal_load() -> None:
    """Regression test: THERM-S had no cooling path at all until #27, so it
    rose every tick even at nominal load, with zero faults. Every thermal
    zone in the sample topology must stay bounded over many ticks, not just
    the one previous tests happened to check.
    """
    graph = build_sample_topology().graph
    thermal_zones = [n for n, d in graph.nodes(data=True) if d["type"] == "thermal_zone"]
    baselines = {zone_id: graph.nodes[zone_id]["metrics"]["temperatureCelsius"] for zone_id in thermal_zones}

    for _ in range(50):
        step_thermal(graph)

    for zone_id in thermal_zones:
        current = graph.nodes[zone_id]["metrics"]["temperatureCelsius"]
        assert abs(current - baselines[zone_id]) < 5.0, f"{zone_id} drifted from {baselines[zone_id]} to {current}"


def test_rising_server_load_raises_connected_thermal_zone_temperature() -> None:
    graph = build_sample_topology().graph
    baseline = graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"]
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0

    for _ in range(5):
        step_thermal(graph)

    assert graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] > baseline


def test_severed_coolant_line_stops_cooling_a_zone() -> None:
    graph = build_sample_topology().graph
    graph.edges["THERM-N", "RAD-1"]["status"] = "severed"
    graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0
    baseline = graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"]

    for _ in range(5):
        step_thermal(graph)

    severed_rise = graph.nodes["THERM-N"]["metrics"]["temperatureCelsius"] - baseline

    graph_live = build_sample_topology().graph
    graph_live.nodes["SRV-01"]["metrics"]["powerLoadPercent"] = 90.0
    for _ in range(5):
        step_thermal(graph_live)
    live_rise = graph_live.nodes["THERM-N"]["metrics"]["temperatureCelsius"] - baseline

    assert severed_rise > live_rise


def test_electrical_is_stable_at_nominal_load() -> None:
    graph = build_sample_topology().graph
    baseline = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]

    step_electrical(graph)

    assert graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] == baseline
    assert graph.nodes["SRV-01"]["status"] == "nominal"


def test_congested_feed_draws_down_the_battery() -> None:
    graph = build_sample_topology().graph
    graph.edges["BUS-A", "TRANSFORMER-1"]["status"] = "congested"
    baseline_charge = graph.nodes["BATT-1"]["metrics"]["batteryChargePercent"]

    step_electrical(graph)

    assert graph.nodes["BATT-1"]["metrics"]["batteryChargePercent"] < baseline_charge


def test_severed_feed_with_no_battery_path_raises_server_load() -> None:
    graph = build_sample_topology().graph
    graph.edges["TRANSFORMER-1", "SRV-01"]["status"] = "severed"
    baseline_load = graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"]

    step_electrical(graph)

    assert graph.nodes["SRV-01"]["metrics"]["powerLoadPercent"] > baseline_load
    assert graph.nodes["SRV-01"]["status"] in {"degraded", "critical"}
