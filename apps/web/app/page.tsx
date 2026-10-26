"use client";

import { useStationSocket } from "@/lib/telemetry/useStationSocket";

export default function Home() {
  const { status, snapshot, messages } = useStationSocket();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black font-mono text-emerald-400">
      <h1 className="text-2xl tracking-widest">PALADIN-STATION</h1>
      <p className="text-sm text-zinc-500">Phase 3 scaffold, apps/web streaming live from apps/sim</p>
      <p className="text-lg">
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
    </main>
  );
}
