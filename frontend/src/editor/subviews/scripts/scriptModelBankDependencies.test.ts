import { expect, it } from "vitest";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";
import { runtimeLevelConfigSchema } from "./scriptWorkspaceStateTypes";
import { getScriptModelBankDependencies } from "./scriptModelBankDependencies";
import { getNativeVisualGroupOptions } from "./scriptNativeVisualGroups";

function visual(group: Extract<ScriptCustomObjectDefinition["visual"], { kind: "nativeDisplayGroup" }>["group"]): ScriptCustomObjectDefinition["visual"] {
  return { kind: "nativeDisplayGroup", group, modelObject: 0, scale: 1, slot: 100 };
}

it("exports each referenced named bank once and leaves active banks to native loading", () => {
  expect(getScriptModelBankDependencies("OttoMatic-Android", [visual("farm"), visual("farm"), visual("cloud"), visual("global"), visual("levelSpecific")])).toEqual([
    { kind: "modelGroup", id: "farm" },
    { kind: "modelGroup", id: "cloud" },
  ]);
});

it("exports scene shape banks and excludes groups belonging to another game", () => {
  expect(getScriptModelBankDependencies("MightyMike-Android", [visual("candy2"), visual("weapons"), visual("farm")])).toEqual([
    { kind: "modelGroup", id: "candy2" },
  ]);
  expect(getNativeVisualGroupOptions("Bugdom2-Android").map((option) => option.value)).toContain("plumbing");
  expect(getNativeVisualGroupOptions("Bugdom2-Android").map((option) => option.value)).toContain("gutter");
});

it("accepts dependency collections while keeping ordinary settings scalar", () => {
  const dependencies = getScriptModelBankDependencies("OttoMatic-Android", [visual("cloud")]);
  expect(runtimeLevelConfigSchema.safeParse({ script: "main.lua", levelSettings: { assetDependencies: dependencies, speed: 2 } }).success).toBe(true);
  expect(runtimeLevelConfigSchema.safeParse({ script: "main.lua", levelSettings: { unrelated: dependencies } }).success).toBe(false);
});
