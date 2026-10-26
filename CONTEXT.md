# CONTEXT.md

The domain model and core vocabulary for this project.

## What this project is

Project PALADIN is a high-fidelity, interactive 2D application simulating an orbital edge-compute facility, PALADIN-Station. The station encounters physical anomalies (solar flares, micrometeoroid punctures, cooling containment breaches), and a squad of five autonomous engineering agents detects, diagnoses, and resolves each fault under formal safety constraints.

The application has two faces:

- **The Tactical Console** — a zoomable, pannable 2D telemetry grid showing power buses, servers, and thermal vectors, rendered in a retro sci-fi space strategy style.
- **The Operations Deck** — a streaming panel tracking the five agents as they manage an emergency in real time.

This is a long-running personal project, built for its own sake and out of genuine interest in distributed systems, multi-agent orchestration, and formal verification, not a one-off exercise tied to any particular application or deadline.

## The five-agent squad

- **ORION** — Command Orchestrator. Manages service-level compliance and task distribution across the other four agents, and turns Athena's verdict into a commit or rollback, the "final validation handshake" is Orion acting on Athena's verdict, not a second validation pass.
- **VULCAN** — Thermal & Fluids Governor. Runs the physics loop for ambient dissipation, coolant velocity, and hydraulic radiator arrays.
- **TESLA** — Electrical Grid Overseer. Governs circuit topology, dynamic transformer load, phase alignment, and battery discharge rate.
- **MERCURY** — Workload & Network Router. Handles live VM and container migration, packet rerouting, and low-latency channel routing.
- **ATHENA** — Deterministic Trust & Verification Engine. The zero-hallucination compliance officer: every fix proposed by the other four agents passes through Athena's validation step before it is applied. Starts as a rule-based safety checker; a formal SMT-backed version (for example Z3) is a candidate upgrade, gated behind a research ticket.

## Core vocabulary

- **Telemetry grid** — the live 2D snapshot of station state: nodes (servers, power buses, thermal zones) and the edges connecting them (power lines, coolant lines, network links), each carrying position, status, and metrics.
- **Fault** — an injected anomaly (solar flare, micrometeoroid puncture, cooling breach) that perturbs one or more nodes or edges and must be resolved by the squad.
- **Fix proposal** — a concrete change an agent proposes to resolve a fault, for example rerouting a circuit, migrating a workload, or opening a coolant valve.
- **Validation handshake** — the exchange between a proposing agent and Athena: a fix proposal goes in, a pass or fail verdict (with reasoning) comes out. Nothing is applied to station state without a pass.
- **Simulation tick** — one fixed-timestep step of the physics and routing engine, used to advance station state and settle the effect of applied fixes.

## Non-goals

- This is not a general-purpose data centre monitoring tool. It is a scripted, demo-grade simulation built to showcase engineering judgement, not a production SRE product.
- Not aiming for real-time multiplayer or persistence beyond a single session, unless a later phase decides otherwise.
