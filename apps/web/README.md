# web

The Next.js frontend: the Tactical Console and the Operations Deck. See `/docs/architecture/ARCHITECTURE.md` at the repository root for the full system design.

## Run it

```
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with `apps/sim` already running. The page connects to `apps/sim`'s `/ws` and renders the Tactical Console live: every node and edge in the real station graph, coloured by type and status, updating as the backend ticks and as faults fire and fixes commit. A status line shows connection state, the current tick, and the last agent-protocol message received.

The Console (`components/console/Console.tsx`) is PixiJS plus pixi-viewport (ADR-0001), promoted from the disposable `prototypes/console-render` prototype once its pan/zoom was confirmed in a real browser (#77). It builds its scene once and updates node/edge graphics in place on every snapshot, rather than rebuilding, so panning and zooming survive a tick.
