import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import type { BG3DParseResult } from "../modelParsers/parseBG3D.js";
import { applyNativeRecipe } from "./nativeRecipe.js";

function fixture() {
  const document = new Document();
  document.createMaterial("Body");
  const parsed: BG3DParseResult = { materials: [{ flags: 1, diffuseColor: [1, 1, 1, 1], textures: [] }], groups: [],
    skeleton: { version: 1, numAnims: 1, numJoints: 0, num3DMFLimbs: 0, bones: [],
      animations: [{ name: "Walk", numAnimEvents: 0, events: [], keyframes: {} }] } };
  return { document, parsed };
}

describe("persistent native import adjustments", () => {
  it("updates named native appearance and sorted event records while preserving source data", () => {
    const { parsed, document } = fixture();
    const result = applyNativeRecipe(parsed, document, {
      materialMappings: [{ material: "Body", clampU: true, alwaysBlend: true, diffuseColor: [0.25, 0.5, 1, 0.75] }],
      animationEvents: [{ clip: "Walk", events: [{ time: 10, type: 1, value: 0 }, { time: 3, type: 6, value: 4 }] }],
    }, "ottomatic");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.materials[0]?.flags).toBe(7);
    expect(result.value.materials[0]?.diffuseColor).toEqual([0.25, 0.5, 1, 0.75]);
    expect(result.value.skeleton?.animations[0]?.events.map((event) => event.time)).toEqual([3, 10]);
    expect(result.value.skeleton?.animations[0]?.numAnimEvents).toBe(2);
    expect(parsed.materials[0]?.flags).toBe(1);
    expect(parsed.skeleton?.animations[0]?.events).toEqual([]);
  });

  it.each(["Missing", "Body"])('rejects missing or ambiguous material "%s"', (material) => {
    const { parsed, document } = fixture();
    if (material === "Body") document.createMaterial("Body");
    const result = applyNativeRecipe(parsed, document, { materialMappings: [{ material, clampV: true }] }, "ottomatic");
    expect(result.isErr() && result.error).toContain("missing or ambiguous");
  });

  it("rejects stale clip mappings and unsafe native flag indices", () => {
    const { parsed, document } = fixture();
    expect(applyNativeRecipe(parsed, document, { animationEvents: [{ clip: "Removed", events: [] }] }, "ottomatic").isErr()).toBe(true);
    const unsafe = applyNativeRecipe(parsed, document, { animationEvents: [{ clip: "Walk", events: [{ time: 0, type: 6, value: 5 }] }] }, "ottomatic");
    expect(unsafe.isErr() && unsafe.error).toContain("flags 0 through 4");
    const unsupported = applyNativeRecipe(parsed, document, { materialMappings: [{ material: "Body", clampU: true }] }, "bugdom");
    expect(unsupported.isErr() && unsupported.error).toContain("3DMF cannot preserve");
  });
});
