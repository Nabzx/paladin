# CLAUDE.md

Conventions for Claude Code when working in this repository.

## Quick orientation

Read `AGENTS.md` for the full workflow: phases, tracks, the wayfinder protocol, labels, research and ADR conventions. This file covers the Claude Code-specific angle: house style and which skills to reach for.

## House style

- British English throughout (organise, colour, behaviour, licence as a noun).
- No em dashes. Use a comma, a colon, or a full stop instead.
- Short, direct sentences. No padding, no hedging.
- No AI-generated filler: words like "comprehensive", "robust", "seamless", or "leverage" only earn their place if they're doing real work.
- Don't add abstractions, error handling, or options for scenarios that can't happen. See the root instructions on scope discipline, they apply here too.

## Commits

- Conventional Commits: `type(scope): summary`, e.g. `feat(cli): add status command (#12)`.
- One logical change per commit. Several small commits per issue, not one large one.
- Reference the issue with `refs #n` in the body, not `closes #n`. The maintainer closes issues after review.
- No co-author trailers on commits in this repository.

## Skills to reach for

- `frontend-design` or `ui-ux-pro-max` for any UI or visual work, to avoid templated, default-looking interfaces.
- `simplify` and `code-review` before calling a change finished, to catch slop, dead code, and unnecessary abstraction.
- `commit-commands` for the actual commit, push, and PR flow.
- `claude-md-management` to keep this file and `AGENTS.md` current as the project evolves.
- `feature-dev` for anything bigger than a one-file fix: explore, design, implement, review.

## Structure

See `AGENTS.md` for labels, phases, tracks, and the wayfinder protocol. See `ROADMAP.md` for the live phase table.

## Documents

Reference materials (specs, research exports, briefs) go in `/materials/`, which is gitignored. Never commit raw documents to the repository.
