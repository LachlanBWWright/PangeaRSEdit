import { describe, expect, it } from "vitest";
import { engineManifestSchema, engineSceneSchema } from "./engineSchemas";

const manifest = { version: 1, id: "limits", name: "Limits", entry: "main.lua", tickRate: 60,
  initialScene: "main", scenes: [{ id: "main", name: "Main", file: "scene.json", controller: "main" }] };

describe("engine package load-time limits", () => {
  it("preserves default packages and accepts bounded expanded budgets", () => {
    expect(engineManifestSchema.safeParse(manifest).success).toBe(true);
    expect(engineManifestSchema.safeParse({ ...manifest, limits: { actors: 2048, models: 128, modelBytes: 1024 ** 3 } }).success).toBe(true);
    expect(engineManifestSchema.safeParse({ ...manifest, limits: { actors: 512 } }).success).toBe(true);
  });
  it("rejects malformed limits consistently with the native loader", () => {
    for (const limits of [null, [], 1, { actors: 0 }, { actors: 2049 }, { actors: 1.5 }, { models: 129 },
      { modelBytes: 1048575 }, { modelBytes: 1073741825 }, { modelBytes: 1073741823.5 }, { actors: "512" }, { unexpected: 1 }]) {
      expect(engineManifestSchema.safeParse({ ...manifest, limits }).success).toBe(false);
    }
  });
  it("allows import-only VM budgets without relaxing simulation callbacks", () => {
    const scriptBudgets = { memoryBytes: 128 * 1024 * 1024, loadInstructions: 50_000_000 };
    expect(engineManifestSchema.safeParse({ ...manifest, scriptBudgets }).success).toBe(true);
    for (const invalid of [{ memoryBytes: 0 }, { loadInstructions: 500_000_001 },
      { eventInstructions: 999 }, { frameInstructions: 5_000_001 },
      { aggregateFrameInstructions: 50_000_001 }, { frameInstructions: 500_000, aggregateFrameInstructions: 499_999 },
      { unexpected: 1 }, { memoryBytes: "134217728" }]) {
      expect(engineManifestSchema.safeParse({ ...manifest, scriptBudgets: invalid }).success).toBe(false);
    }
  });
  it("accepts 128 authored assets while retaining the authored entity bound", () => {
    const scene = { version: 1, terrain: { samplesX: 2, samplesZ: 2, sizeX: 100, sizeZ: 100,
      chunkSize: 100, cellsPerChunk: 1, heights: [0, 0, 0, 0] },
    assets: Array.from({ length: 128 }, (_, index) => ({ id: `asset-${index}`, file: `models/${index}.bg3d` })) };
    expect(engineSceneSchema.safeParse(scene).success).toBe(true);
    expect(engineSceneSchema.safeParse({ ...scene, assets: [...scene.assets, { id: "overflow", file: "overflow.bg3d" }] }).success).toBe(false);
  });
});
