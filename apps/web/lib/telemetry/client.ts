const SIM_URL = process.env.NEXT_PUBLIC_SIM_URL ?? "http://localhost:8000";

export type SimStatus = "online" | "offline";

export async function checkSimHealth(): Promise<SimStatus> {
  try {
    const response = await fetch(`${SIM_URL}/health`, { cache: "no-store" });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}
