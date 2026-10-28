"use client";

import dynamic from "next/dynamic";
import { OpsDeck } from "@/components/ops-deck/OpsDeck";
import { useStationSocket } from "@/lib/telemetry/useStationSocket";

// PixiJS needs a real canvas and window, disabling SSR for it avoids
// sprinkling typeof window guards through the component.
const Console = dynamic(() => import("@/components/console/Console").then((module) => module.Console), {
  ssr: false,
});

export default function Home() {
  const { status, snapshot, messages } = useStationSocket();

  return (
    <main className="relative min-h-screen bg-black">
      <div className="pointer-events-none absolute left-4 top-4 z-10 font-mono text-emerald-400">
        <h1 className="text-2xl tracking-widest">PALADIN-STATION</h1>
        <p className="text-sm">
          Link:{" "}
          <span
            className={
              status === "open" ? "text-emerald-400" : status === "closed" ? "text-red-500" : "text-zinc-500"
            }
          >
            {status.toUpperCase()}
          </span>
        </p>
        {snapshot && (
          <p className="text-sm text-zinc-400">
            tick {snapshot.tick} · {snapshot.nodes.length} nodes · {snapshot.edges.length} edges
          </p>
        )}
        {messages.length > 0 && (
          <p className="text-sm text-zinc-400">last message: {messages[messages.length - 1].type}</p>
        )}
      </div>
      <OpsDeck messages={messages} />
      <Console snapshot={snapshot} />
    </main>
  );
}
