# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Initial repository scaffolding: conventions, labels, templates, and documentation structure.
- Project PALADIN domain model, proposed architecture, and telemetry/agent-protocol JSON schemas.
- ADR-0001: stack and rendering engine (Next.js/Tailwind/PixiJS frontend, FastAPI/Python backend).
- `apps/web` and `apps/sim` scaffolding, proven to talk to each other end to end.
- Disposable PixiJS pan/zoom rendering prototype at `prototypes/console-render`.
- ADR-0002, ADR-0003, ADR-0004: physical emulation, routing math, and ATHENA's verification model.
- Phase 1 complete: the engine's architecture, data contracts, and algorithms are all settled.

### Changed

- Faults can now target a specific edge (`affectedEdgeIds`), not only nodes, found while grilling ADR-0004 against a concrete scenario.
- ADR-0004's no-secondary-cascade check now also requires the originally-faulted node to actually improve, not just that nothing new breaks.

### Planned

- Phase 2: the real simulation tick, physics, routing, fault injection, agents, and ATHENA's checker, built headless against the Phase 1 ADRs.
