# web

The Next.js frontend: the Tactical Console and the Operations Deck. See `/docs/architecture/ARCHITECTURE.md` at the repository root for the full system design.

## Run it

```
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with `apps/sim` already running. The page connects to `apps/sim`'s `/ws`, shows connection status, the current tick, node/edge counts, and the last agent-protocol message received.
