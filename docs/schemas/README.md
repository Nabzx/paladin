# Schemas

JSON Schema (2020-12) definitions for PALADIN's two core data contracts.

- `telemetry.schema.json` — a single snapshot of the tactical telemetry grid: nodes (servers, power buses, thermal zones, and so on), the edges connecting them, and any active faults.
- `agent-protocol.schema.json` — the asynchronous message envelope the five agents, the engine, and the frontend exchange: status broadcasts, fault alerts, fix proposals, and Athena's validation request/result pair.

Both are proposed, not final, pending the Phase 1 research tickets on stack choice and Athena's verification model. Treat field names as stable intent, not a frozen contract.
