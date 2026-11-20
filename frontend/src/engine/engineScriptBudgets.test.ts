import { describe, expect, it } from "vitest";
import { engineManifestSchema } from "./engineSchemas";

const manifest = {
  version: 1, id: "budget-tests", name: "Bounded asset loading", entry: "main.lua", tickRate: 60,
  initialScene: "main", scenes: [{ id: "main", name: "Main", file: "scene.json", controller: "main" }],
};

describe("package script budgets", () => {
  it("keeps existing packages valid and accepts bounded asset-loading budgets", () => {
    expect(engineManifestSchema.safeParse(manifest).success).toBe(true);
    expect(engineManifestSchema.safeParse({ ...manifest, scriptBudgets: {
      memoryBytes: 128 * 1024 * 1024, loadInstructions: 50_000_000, eventInstructions: 50_000_000,
      frameInstructions: 50_000, aggregateFrameInstructions: 1_000_000,
    } }).success).toBe(true);
  });

  it.each([
    { memoryBytes: 1023 }, { memoryBytes: 513 * 1024 * 1024 }, { loadInstructions: 500_000_001 },
    { eventInstructions: 999 }, { frameInstructions: 5_000_001 }, { loadInstructions: 1000.5 },
    { aggregateFrameInstructions: 49_999 }, { frameInstructions: 2_000_000 },
    { frameInstructions: 100_000, aggregateFrameInstructions: 99_999 }, { unknownBudget: 1 },
  ])("rejects invalid or inconsistent budgets: %j", scriptBudgets => {
    expect(engineManifestSchema.safeParse({ ...manifest, scriptBudgets }).success).toBe(false);
  });
});
