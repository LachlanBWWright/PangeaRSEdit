import { describe, expect, it } from "vitest";
import { buildNativeSpawnDeclarations, buildNativeSpawnOverloads } from "@/editor/subviews/scripts/scriptNativeDeclarations";

describe("native spawn declarations", () => {
  const items = [{
    id: "6",
    label: "6: Powerup",
    category: "Terrain item",
    description: "Powerup",
    params: [{ name: "param0", description: "Powerup kind", values: ["0 (Health)", "1 (Weapon)"] }],
  }];

  it("emits semantic selector types", () => {
    expect(buildNativeSpawnDeclarations(items)).toContain("---@field param0 0|1|nil Powerup kind");
    expect(buildNativeSpawnOverloads(items)).toEqual([
      "---@overload fun(id: 6, position: Vector3, options: NativeSpawnOptions_6): ObjectHandle|nil",
    ]);
  });
});
