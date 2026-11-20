import { describe, expect, it } from "vitest";
import { createWorkshopPackage } from "./workshopPackage";
import { engineFile, parseScene, replaceEngineScene, validateEnginePackage } from "./enginePackage";
import { editEngineHeight, engineHeightAt } from "./engineTerrainEditing";
import { engineWorkspaceReducer, initialEngineWorkspace } from "./engineWorkspaceState";
import { createEngineTerrainPackage } from "./engineLevelConversion";
import { createBlankLevel } from "@/data/levelTemplates";
import { Game, OttoGlobals } from "@/data/globals/globals";

describe("engine level editing", () => {
  it("preserves original per-cell diagonals in validation and editor height sampling", () => {
    const scene = { version: 1, terrain: { samplesX: 2, samplesZ: 2, sizeX: 100, sizeZ: 100,
      chunkSize: 100, cellsPerChunk: 1, heights: [0, 0, 0, 100], splits: [1] } };
    const parsed = parseScene({ path: "scene.json", bytes: new TextEncoder().encode(JSON.stringify(scene)) });
    expect(parsed.isOk()).toBe(true); if (parsed.isErr()) return;
    expect(engineHeightAt(parsed.value, 25, 25)).toBe(0);
    expect(engineHeightAt(parsed.value, 75, 75)).toBe(50);
    expect(engineHeightAt({ ...parsed.value, terrain: { ...parsed.value.terrain, splits: [0] } }, 25, 25)).toBe(25);
    for (const splits of [[], [0, 1], [2], [-1], [.5], ["1"]]) {
      const invalid = { ...scene, terrain: { ...scene.terrain, splits } };
      expect(parseScene({ path: "scene.json", bytes: new TextEncoder().encode(JSON.stringify(invalid)) }).isErr()).toBe(true);
    }
  });
  it("edits height samples without changing topology and supports undo/redo", () => {
    const packageData = createWorkshopPackage();
    const file = engineFile(packageData, "scenes/menu.json");
    expect(file).toBeDefined(); if (!file) return;
    const parsed = parseScene(file); expect(parsed.isOk()).toBe(true); if (parsed.isErr()) return;
    const raised = editEngineHeight(parsed.value, 500, 500, "raise", 25, 0);
    expect(raised.terrain.heights[4]).toBe(95);
    expect(parsed.value.terrain.heights[4]).toBe(70);
    expect(editEngineHeight(parsed.value, 500, 500, "raise", 0, 0)).toBe(parsed.value);
    expect(editEngineHeight(parsed.value, 500, 500, "select", 25, 0)).toBe(parsed.value);
    expect(raised.terrain.samplesX).toBe(3);
    const replacement = replaceEngineScene(packageData, file.path, raised);
    expect(replacement.isOk()).toBe(true); if (replacement.isErr()) return;
    const initial = { ...initialEngineWorkspace(), packageData };
    const edited = engineWorkspaceReducer(initial, { type: "replace", packageData: replacement.value });
    const undone = engineWorkspaceReducer(edited, { type: "undo" });
    expect(undone.packageData).toBe(packageData);
    expect(engineWorkspaceReducer(undone, { type: "redo" }).packageData).toBe(replacement.value);
    expect(engineHeightAt(raised, 500, 500)).toBe(95);
    expect(editEngineHeight(raised, 500, 500, "flatten", 12, 1).terrain.heights[4]).toBe(12);
  });
  it("preserves world dimensions and height scaling from an actual Otto blank-level template", () => {
    const blank = createBlankLevel(Game.OTTO_MATIC, { width: 32, height: 32, defaultTerrainHeight: 16 });
    expect(blank.isOk()).toBe(true); if (blank.isErr()) return;
    const converted = createEngineTerrainPackage(blank.value.headerData, blank.value.terrainData, OttoGlobals, "Otto terrain");
    expect(converted.isOk()).toBe(true); if (converted.isErr()) return;
    expect(validateEnginePackage(converted.value).isOk()).toBe(true);
    const file = engineFile(converted.value, "scenes/terrain.json"); if (!file) return;
    const scene = parseScene(file); expect(scene.isOk()).toBe(true); if (scene.isErr()) return;
    expect(scene.value.terrain.sizeX).toBe(32 * OttoGlobals.TILE_INGAME_SIZE);
    expect(scene.value.terrain.heights[0]).toBe(16 * OttoGlobals.TILE_INGAME_SIZE / blank.value.headerData.Hedr[1000].obj.tileSize);
    expect(scene.value.colliders).toEqual([]);
  });
});
