# web

The Next.js frontend: the Tactical Console and the Operations Deck. See `/docs/architecture/ARCHITECTURE.md` at the repository root for the full system design.

## Run it

```
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page reports whether it can reach `apps/sim`'s `/health` endpoint.
