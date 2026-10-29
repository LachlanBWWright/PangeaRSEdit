import { describe, expect, it } from "vitest";
import { scriptingRuntimeHealth } from "./scriptRuntimeHealth";
import type { PangeaScriptStatusJS } from "./scriptRuntimeStatus";

const healthy: PangeaScriptStatusJS = {
  enabled: true, scriptsDisabled: false, configLoaded: true, bundleLoaded: true,
  activeScriptPath: "Data/Scripts/dist/main.lua", lastError: "", errorCount: 0,
  budgetExceededCount: 0, hooksCalledCount: 1, statusComplete: true,
};

describe("scripting runtime smoke check", () => {
  it("passes only a clean active host that dispatched a hook with its loaded bundle", () => {
    expect(scriptingRuntimeHealth(healthy, null).kind).toBe("passed");
  });

  it.each<{ name: string; change: Partial<PangeaScriptStatusJS>; kind: string }>([
    { name: "disabled host with historical hook dispatches", change: { scriptsDisabled: true }, kind: "disabled" },
    { name: "inactive host with historical hook dispatches", change: { enabled: false }, kind: "inactive" },
    { name: "missing config", change: { configLoaded: false }, kind: "unverified" },
    { name: "missing bundle", change: { bundleLoaded: false }, kind: "unverified" },
    { name: "new bundle without new hook dispatches", change: { hooksCalledCount: 0 }, kind: "waiting" },
    { name: "missing status export", change: { statusComplete: false }, kind: "unverified" },
    { name: "failed reload retaining the previous bundle", change: { lastError: "candidate.lua:2: syntax error", errorCount: 1, hooksCalledCount: 900 }, kind: "failed" },
    { name: "recovery with earlier runtime errors", change: { errorCount: 2 }, kind: "recovered" },
    { name: "recovery with earlier budget overruns", change: { budgetExceededCount: 1 }, kind: "recovered" },
  ])("does not pass $name", ({ change, kind }) => {
    expect(scriptingRuntimeHealth({ ...healthy, ...change }, null).kind).toBe(kind);
  });

  it("keeps external preview failures visible even when scripting status looks clean", () => {
    expect(scriptingRuntimeHealth(healthy, "Failed to mount script assets").kind).toBe("failed");
    expect(scriptingRuntimeHealth(null, "Failed to initialize runtime").kind).toBe("failed");
  });

  it("explains recovery without clearing cumulative session evidence or claiming a clean smoke check", () => {
    const result = scriptingRuntimeHealth({ ...healthy, errorCount: 2, budgetExceededCount: 1 }, null);
    expect(result.title).toBe("Running after earlier errors");
    expect(result.detail).toContain("Session counters retain earlier counted runtime errors");
  });
});
