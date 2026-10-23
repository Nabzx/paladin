# console-render (prototype, disposable)

Throwaway prototype for [#8](https://github.com/Nabzx/paladin/issues/8): does PixiJS plus pixi-viewport actually hold up for a pannable, zoomable 2D tactical grid, before that choice gets wired into `apps/web`.

Renders a static set of nodes and edges, shaped like `docs/schemas/telemetry.schema.json`, on a draggable, zoomable, pinchable, decelerating viewport. No live data, no agents.

## Run it

```
npm install
npm run dev
```

## Verdict

Type-checks and builds cleanly; the PixiJS/WebGL bundle is genuinely present in the output, not tree-shaken away. Dev server serves and responds. Visual pan/zoom behaviour hasn't been confirmed in a real browser from this session, there's no browser tool available here, so check it locally before trusting the look and feel.

This code is disposable. It only earns a place in `apps/web/components/console` if the look and the interaction hold up once someone's actually looked at it.
