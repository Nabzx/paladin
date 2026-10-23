"use client";

import { useEffect, useState } from "react";
import { checkSimHealth, type SimStatus } from "@/lib/telemetry/client";

export default function Home() {
  const [status, setStatus] = useState<SimStatus | "checking">("checking");

  useEffect(() => {
    checkSimHealth().then(setStatus);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black font-mono text-emerald-400">
      <h1 className="text-2xl tracking-widest">PALADIN-STATION</h1>
      <p className="text-sm text-zinc-500">Phase 1 scaffold, apps/web talking to apps/sim</p>
      <p className="text-lg">
        Sim link:{" "}
        <span
          className={
            status === "online"
              ? "text-emerald-400"
              : status === "offline"
                ? "text-red-500"
                : "text-zinc-500"
          }
        >
          {status.toUpperCase()}
        </span>
      </p>
    </main>
  );
}
