"use client";

import { useEffect, useRef, useState } from "react";
import { isAgentMessage, type AgentMessage } from "@/lib/schemas/agent-protocol";
import { isTelemetrySnapshot, type TelemetrySnapshot } from "@/lib/schemas/telemetry";

const SIM_WS_URL = process.env.NEXT_PUBLIC_SIM_WS_URL ?? "ws://localhost:8000/ws";
const RECONNECT_DELAY_MS = 2000;
const MAX_MESSAGES = 50;

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface StationSocketState {
  status: ConnectionStatus;
  snapshot: TelemetrySnapshot | null;
  messages: AgentMessage[];
}

export function useStationSocket(): StationSocketState {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      setStatus("connecting");
      const socket = new WebSocket(SIM_WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) setStatus("open");
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        const data = JSON.parse(event.data);
        if (isTelemetrySnapshot(data)) {
          setSnapshot(data);
        } else if (isAgentMessage(data)) {
          setMessages((previous) => [...previous.slice(-(MAX_MESSAGES - 1)), data]);
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus("closed");
        reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, []);

  return { status, snapshot, messages };
}
