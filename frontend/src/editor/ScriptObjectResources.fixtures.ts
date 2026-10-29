import type { ScriptObjectResources } from "@pangea/desktop-contracts";

export const ownedResources: ScriptObjectResources = {
  timeSeconds: 12,
  timers: { total: 2, truncated: false, entries: [
    { id: 10, dueTimeSeconds: 15, repeating: true, intervalSeconds: 5, source: "objects/checkpoint.lua", callback: "", line: 12 },
    { id: 11, dueTimeSeconds: 20, repeating: false, intervalSeconds: 0, source: "objects/checkpoint.lua", callback: "", line: 19 },
  ] },
  tasks: { total: 1, truncated: false, entries: [
    { id: 6, status: "sleeping", dueTimeSeconds: 14, source: "objects/checkpoint.lua", callback: "animate", line: 28 },
  ] },
  subscriptions: { total: 1, truncated: false, entries: [
    { id: 9, event: "checkpoint.open", once: true, source: "objects/checkpoint.lua", callback: "", line: 34 },
  ] },
};
