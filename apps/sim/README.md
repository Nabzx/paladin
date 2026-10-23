# paladin-sim

The FastAPI backend: simulation engine, the five agents, and the ATHENA verification gate. See `/docs/architecture/ARCHITECTURE.md` at the repository root for the full system design.

## Run it

```
uv run uvicorn paladin_sim.api.main:app --reload
```

Serves `GET /health` and a placeholder `WS /ws` on `http://localhost:8000`.
