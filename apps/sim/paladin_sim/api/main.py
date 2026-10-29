import asyncio
import contextlib
import itertools
from collections.abc import AsyncIterator
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from paladin_sim.agents import orion
from paladin_sim.api.connections import ConnectionManager
from paladin_sim.api.messages import fault_to_alert_payload, make_message, telemetry_snapshot
from paladin_sim.engine.faults import inject_cooling_breach, inject_micrometeoroid_puncture, inject_solar_flare
from paladin_sim.engine.grid import build_sample_topology
from paladin_sim.sim_loop import SimulationState, advance_tick

TICK_INTERVAL_SECONDS = 2.0
# Housekeeping for a public demo deploy only: one shared, global,
# in-memory state means every visitor's fault injections affect what
# everyone else sees, and nothing else ever clears it (#100).
RESET_INTERVAL_SECONDS = 30 * 60

state = SimulationState(graph=build_sample_topology().graph)
connections = ConnectionManager()
_fault_ids = itertools.count(1)


async def _tick_loop() -> None:
    while True:
        await asyncio.sleep(TICK_INTERVAL_SECONDS)
        advance_tick(state)
        await connections.broadcast(telemetry_snapshot(state))


def _reset_state() -> None:
    state.graph = build_sample_topology().graph
    state.tick = 0
    state.active_faults = []


async def _reset_loop() -> None:
    while True:
        await asyncio.sleep(RESET_INTERVAL_SECONDS)
        _reset_state()
        await connections.broadcast(telemetry_snapshot(state))


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    tasks = [asyncio.create_task(_tick_loop()), asyncio.create_task(_reset_loop())]
    yield
    for task in tasks:
        task.cancel()
    for task in tasks:
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="paladin-sim", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    # Covers a Vercel deploy's assigned origin, whatever subdomain it
    # lands on, scoped to Vercel's own domain rather than a fully open
    # policy (#100, a temporary public demo).
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


Severity = Literal["p1", "p2", "p3"]


class CoolingBreachRequest(BaseModel):
    type: Literal["cooling_breach"]
    from_id: str
    to_id: str
    severity: Severity = "p2"


class MicrometeoroidPunctureRequest(BaseModel):
    type: Literal["micrometeoroid_puncture"]
    from_id: str
    to_id: str
    severity: Severity = "p2"


class SolarFlareRequest(BaseModel):
    type: Literal["solar_flare"]
    node_id: str
    severity: Severity = "p2"


FaultRequest = Annotated[
    CoolingBreachRequest | MicrometeoroidPunctureRequest | SolarFlareRequest,
    Field(discriminator="type"),
]


@app.post("/faults")
async def trigger_fault(request: FaultRequest) -> dict:
    """Injects a fault, lets ORION respond, and broadcasts every resulting
    agent-protocol message to connected WebSocket clients, in order:
    the fault_alert, then ORION's full response trace (every diagnosis,
    proposal, and validation step, not just the final verdict), then a
    fresh telemetry snapshot.
    """
    fault_id = f"F-{next(_fault_ids)}"

    try:
        if request.type == "cooling_breach":
            fault = inject_cooling_breach(
                state.graph, fault_id, request.from_id, request.to_id, severity=request.severity
            )
        elif request.type == "micrometeoroid_puncture":
            fault = inject_micrometeoroid_puncture(
                state.graph, fault_id, request.from_id, request.to_id, severity=request.severity
            )
        else:
            fault = inject_solar_flare(state.graph, fault_id, request.node_id, severity=request.severity)
    except (KeyError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    state.active_faults.append(fault)

    await connections.broadcast(make_message("orion", "fault_alert", fault_to_alert_payload(fault)))

    trace = orion.respond_to_fault(state, fault)
    for message in trace:
        await connections.broadcast(make_message(message["from"], message["type"], message["payload"]))

    final = trace[-1]
    if final["type"] == "commit":
        # A committed fix resolves this fault, found while building #62's
        # HUD: active_faults was append-only, never cleared, an "active
        # fault count" would only ever grow regardless of what ORION fixed.
        state.active_faults = [f for f in state.active_faults if f["id"] != fault["id"]]

    await connections.broadcast(telemetry_snapshot(state))

    return {"fault": fault, "result": {"type": final["type"], "payload": final["payload"]}}


@app.websocket("/ws")
async def telemetry_socket(websocket: WebSocket) -> None:
    """Streams telemetry snapshots and agent-protocol messages.

    Sends the current snapshot immediately on connect, then stays open to
    receive broadcasts from the tick loop and from /faults, until the
    client disconnects.
    """
    await connections.connect(websocket)
    await websocket.send_json(telemetry_snapshot(state))
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connections.disconnect(websocket)
