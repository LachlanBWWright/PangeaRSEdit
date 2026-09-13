import { describe, expect, it } from "vitest";
import { buildNativeSpawnDeclarations, buildNativeSpawnOverloads } from "@/editor/subviews/scripts/scriptNativeDeclarations";
import type { NativeSpawn } from "@/editor/subviews/scripts/scriptApiSchema";

describe("native spawn declarations", () => {
  const items: NativeSpawn[] = [{
    id: "6",
    label: "6: Powerup",
    category: "Terrain item",
    description: "Powerup",
    params: [{ name: "param0", description: "Powerup kind", values: ["0 (Health)", "1 (Weapon)"] }],
    audit: {
      classification: "native-only",
      replacementSurface: "none",
      fallback: "skip-replacement",
      requiredCapabilities: ["nativeSpawn"],
      requiredAssets: ["native-registry"],
      lifecycle: "native-owned",
      modeAudit: "not-audited",
      streaming: "native-owned",
      childObjects: "not-audited",
      saveBehavior: "not-audited",
      runtimeVerification: "not-verified",
      auditBasis: "test fixture",
    },
  }];

  it("emits semantic selector types", () => {
    expect(buildNativeSpawnDeclarations(items)).toContain("---@field param0 0|1|nil Powerup kind");
    expect(buildNativeSpawnOverloads(items)).toEqual([
      "---@overload fun(id: 6, position: Vector3, options: NativeSpawnOptions_6): ObjectHandle|nil",
    ]);
  });
});
