import { describe, expect, it } from "vitest";
import { decodeScriptLevelSidecars } from "./scriptWorkspaceStateRuntime";

const bindingsPath = "bindings/level-1.json";
const placementsPath = "placements/level-1.json";

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function validFiles(): Record<string, Uint8Array> {
  return {
    [bindingsPath]: bytes(JSON.stringify({
      schemaVersion: 1,
      terrainBindings: [],
      splineBindings: [],
      mapItemBindings: [],
    })),
    [placementsPath]: bytes(JSON.stringify({
      schemaVersion: 1,
      placements: [],
    })),
  };
}

describe("decodeScriptLevelSidecars", () => {
  it("decodes both optional level sidecars", () => {
    const result = decodeScriptLevelSidecars(
      validFiles(),
      bindingsPath,
      placementsPath,
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.terrainBindings).toEqual([]);
      expect(result.value.customPlacements).toEqual([]);
    }
  });

  it("rejects malformed bindings instead of committing partial state", () => {
    const files = validFiles();
    files[bindingsPath] = bytes("not-json");

    const result = decodeScriptLevelSidecars(files, bindingsPath, placementsPath);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain(bindingsPath);
  });

  it("rejects malformed placements instead of silently dropping them", () => {
    const files = validFiles();
    files[placementsPath] = bytes(JSON.stringify({ schemaVersion: 1 }));

    const result = decodeScriptLevelSidecars(files, bindingsPath, placementsPath);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain(placementsPath);
  });
});
