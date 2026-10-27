# paladin-sim

The FastAPI backend: simulation engine, the five agents, and the ATHENA verification gate. See `/docs/architecture/ARCHITECTURE.md` at the repository root for the full system design.

## Run it

```
uv run uvicorn paladin_sim.api.main:app --reload
```

Serves on `http://localhost:8000`:

- `GET /health`
- `WS /ws` — streams a telemetry snapshot on connect, then a fresh one every tick, plus every agent-protocol message a triggered fault produces.
- `POST /faults` — injects a fault and lets the five agents respond. Body: `{"type": "cooling_breach" | "micrometeoroid_puncture", "from_id": "...", "to_id": "...", "severity": "p1" | "p2" | "p3"}` or `{"type": "solar_flare", "node_id": "...", "severity": "..."}`. `severity` defaults to `"p2"` if omitted.

## Test it

```
uv run pytest
```
