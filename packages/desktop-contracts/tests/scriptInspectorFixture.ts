import type { ScriptInspectorSnapshot } from "../src/scriptInspector.js";

export const inspectorFixture: ScriptInspectorSnapshot = {
  version: 1, enabled: true, disabled: false, rulesControlled: false,
  errors: 0, budgetOverruns: 0, hooks: 42, lastError: "", commandRejections: 2, callbackFailures: 0,
  runtime: { memoryUsedBytes: 65536, memoryLimitBytes: 16777216, timers: 1, timerLimit: 128,
    tasks: 0, taskLimit: 64, subscriptions: 1, subscriptionLimit: 128, frame: 120,
    loadBudget: 1000000, eventBudget: 100000, frameBudget: 50000,
    diagnostics: {
      lastFailure: { kind: "rejected-command", callback: "onUpdate", source: "Data/Scripts/dist/enemy.lua",
        line: 18, object: { id: 1, generation: 2 }, message: "setAnimation: animation index is unavailable" },
      frame: { level: 0, frame: 120, instructions: 8400, limit: 1000000, truncated: false,
        unattributedInstructions: 0,
        entries: [{ callback: "onUpdate", source: "Data/Scripts/dist/enemy.lua", line: 12,
          object: { id: 1, generation: 2 }, instructions: 8400 }] },
      previousFrame: { level: 0, frame: 119, instructions: 8100, limit: 1000000, truncated: true,
        unattributedInstructions: 100,
        entries: [{ callback: "onUpdate", source: "Data/Scripts/dist/enemy.lua", line: 12,
          object: { id: 1, generation: 2 }, instructions: 8000 }] },
    } },
  registeredObjects: 2, truncated: false,
  objects: [
    { id: 1, generation: 2, type: "custom.enemy", definition: "custom.enemy", controlled: true,
      enabled: true, owner: null, position: { x: 1020, y: 80, z: 530 },
      state: { health: "7", note: 'quoted" and slash\\ and newline\n', nested: "[table]" } },
    { id: 2, generation: 1, type: "custom.projectile", definition: "custom.projectile", controlled: true,
      enabled: false, owner: { id: 1, generation: 2 }, position: null, state: { lifetime: "0.5" } },
  ],
};
