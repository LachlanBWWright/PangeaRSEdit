import { describe, expect, it } from "vitest";
import { BugdomGlobals, OttoGlobals } from "@/data/globals/globals";
import {
  buildScriptDefinitionBundle,
  importScriptDefinitionBundle,
} from "./scriptDefinitionBundle";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
} from "./scriptWorkspaceState";

describe("script definition bundles", () => {
  it("round-trips game-scoped definitions without level placements", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(workspace);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;

    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      context,
    );
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) return;

    expect(importedResult.value.gameId).toBe(context.gameId);
    expect(importedResult.value.definitions).toHaveLength(1);
    expect(Object.keys(importedResult.value.sources)).toHaveLength(1);
  });

  it("rejects definitions imported into a different game", () => {
    const sourceContext = createScriptWorkspaceContext(OttoGlobals, 0);
    const sourceWorkspace = loadScriptSample(sourceContext, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(sourceWorkspace);
    const targetContext = createScriptWorkspaceContext(BugdomGlobals, 0);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;
    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      targetContext,
    );
    expect(importedResult.isErr()).toBe(true);
  });
});
