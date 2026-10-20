export function getLuaIntelligenceStatus(
  configured: boolean,
  status: "disconnected" | "connecting" | "connected" | "unavailable",
): string {
  if (!configured) return "API help (LuaLS backend not configured)";
  if (status === "connected") return "LuaLS connected";
  if (status === "connecting") return "connecting to LuaLS";
  return "API help (LuaLS unavailable)";
}
