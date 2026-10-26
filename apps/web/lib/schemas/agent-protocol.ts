// Mirrors docs/schemas/agent-protocol.schema.json.

export type AgentId = "orion" | "vulcan" | "tesla" | "mercury" | "athena";

export type MessageType =
  | "status_broadcast"
  | "fault_alert"
  | "fix_proposal"
  | "validation_request"
  | "validation_result"
  | "commit"
  | "rollback";

export interface AgentMessage {
  messageId: string;
  correlationId?: string;
  timestamp: string;
  from: AgentId;
  to?: AgentId;
  type: MessageType;
  payload: Record<string, unknown>;
}

export function isAgentMessage(data: unknown): data is AgentMessage {
  return typeof data === "object" && data !== null && "type" in data && "payload" in data;
}
