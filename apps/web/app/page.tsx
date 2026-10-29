"use client";

import dynamic from "next/dynamic";
import { AlarmToggle } from "@/components/AlarmToggle";
import { CockpitHud } from "@/components/CockpitHud";
import { MissionLog } from "@/components/ops-deck/MissionLog";
import { OpsDeck } from "@/components/ops-deck/OpsDeck";
import { ReplayControl } from "@/components/ReplayControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAlarmKlaxon } from "@/lib/audio/useAlarmKlaxon";
import { useIncidentRecorder } from "@/lib/replay/useIncidentRecorder";
import { useReplay } from "@/lib/replay/useReplay";
import { useStationSocket } from "@/lib/telemetry/useStationSocket";
import { useTheme } from "@/lib/theme/useTheme";

// PixiJS needs a real canvas and window, disabling SSR for it avoids
// sprinkling typeof window guards through the component.
const Console = dynamic(() => import("@/components/console/Console").then((module) => module.Console), {
  ssr: false,
});

export default function Home() {
  const { status, snapshot, messages } = useStationSocket();
  // Tied to live messages always, not the replay's: re-triggering the
  // klaxon by scrubbing past an old fault would be a surprising side
  // effect of navigating history, not something a replay control implies.
  const { muted, toggleMuted } = useAlarmKlaxon(messages);
  const { theme, toggleTheme } = useTheme();

  const history = useIncidentRecorder(snapshot, messages);
  const { scrubIndex, playing, scrubTo, goLive, togglePlaying } = useReplay(history);
  const replaying = scrubIndex !== null;
  const displaySnapshot = replaying ? history[scrubIndex].snapshot : snapshot;
  const displayMessages = replaying ? history[scrubIndex].messages : messages;

  return (
    <main className="relative min-h-screen bg-black">
      {/* data-theme scopes the --chrome-* tokens (globals.css) to this
          overlay chrome only, the Tactical Console below it is a separate
          sibling, #67's theme toggle never touches its own rendering. */}
      <div data-theme={theme}>
        <div className="pointer-events-none absolute left-4 top-4 z-10 font-mono text-emerald-400">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl tracking-widest">PALADIN-STATION</h1>
            <div className="flex gap-2">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <AlarmToggle muted={muted} onToggle={toggleMuted} />
            </div>
          </div>
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
          {replaying && <p className="text-sm text-amber-400">REPLAY</p>}
          {displaySnapshot && (
            <p className="text-sm text-[var(--chrome-text-tertiary)]">
              tick {displaySnapshot.tick} · {displaySnapshot.nodes.length} nodes · {displaySnapshot.edges.length} edges
            </p>
          )}
          {displayMessages.length > 0 && (
            <p className="text-sm text-[var(--chrome-text-tertiary)]">
              last message: {displayMessages[displayMessages.length - 1].type}
            </p>
          )}
        </div>
        <OpsDeck messages={displayMessages} />
        <MissionLog messages={displayMessages} />
        <CockpitHud snapshot={displaySnapshot} />
        <ReplayControl
          history={history}
          scrubIndex={scrubIndex}
          playing={playing}
          onScrub={scrubTo}
          onGoLive={goLive}
          onTogglePlaying={togglePlaying}
        />
      </div>
      <Console snapshot={displaySnapshot} messages={displayMessages} />
    </main>
  );
}
