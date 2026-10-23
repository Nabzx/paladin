# AGENTS.md

Structure and conventions for anyone, human or agent, working in this repository.

## Phases

Work is organised into phases. Each phase maps to one milestone (`vX.Y.Z`) and one `phase-N` label. A phase ends when its milestone closes.

## Tracks

If the project splits into more than one workstream running in parallel, each gets a `track-*` label (for example `track-a`, `track-b`). Not in use until that happens.

## The wayfinder protocol

Each phase opens with one `wayfinder:map` issue: the phase's single source of truth for what's known, decided, and next.

A map issue body has three sections, kept up to date as children close:

- **Fog** — open unknowns.
- **Decisions so far** — what's been settled, and why.
- **Frontier** — the next unblocked tickets.

Child tickets hang off the map issue with a `Part of: #n` line, and carry one of:

- `wayfinder:research` — investigate and report back, no implementation.
- `wayfinder:grilling` — stress-test a plan or decision before committing to it.
- `wayfinder:prototype` — throwaway build to answer a design question.
- `wayfinder:task` — a concrete, scoped piece of work.

## Labels

- Phase: `phase-0`, `phase-1`, and so on.
- Track: `track-a`, `track-b`, added once more than one workstream exists.
- Wayfinder: `wayfinder:map`, `wayfinder:research`, `wayfinder:grilling`, `wayfinder:prototype`, `wayfinder:task`.
- Severity: `p1`, `p2`, `p3`.
- Workflow: `needs-decision`, `needs-repro`, `needs-research`, `ready-for-agent`, `pending-release`.
- Defaults: `bug`, `documentation`, `enhancement`.

## Research tracks

Output of a `wayfinder:research` ticket lands in `docs/research/issue-<n>-<slug>.md`. Every file ends with a recommendation. A recommendation that's adopted gets promoted to a numbered ADR in `docs/adr/`.

## Architecture decisions

`docs/adr/` holds numbered ADRs, one decision per file, starting from `docs/adr/0000-template.md`. The index lives in `docs/adr/README.md` and must stay in sync with the files present.

## Issues

- Use the templates in `.github/ISSUE_TEMPLATE/`. Blank issues are disabled, feature ideas and questions go to Discussions instead.
- Keep bug reports short: steps to reproduce, expected versus actual behaviour, environment. No root-cause guesses or patches in the report itself.

## Pull requests

- Title: Conventional Commits, with scope where it helps, for example `feat(cli): add status command (#12)`.
- Body: *What this does*, *Why*, and a checklist (tests pass, docs updated if behaviour changed, ADR added if touching architecture).
- Reference the issue with `refs #n`, not `closes #n`. The maintainer closes issues on merge.
- Small commits, Conventional Commits, no co-author trailers.

## House style

- British English throughout.
- No em dashes.
- Short and direct. No filler, no hedging.

## Documents

Reference materials go in `/materials/`, which is gitignored and never committed.
