import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { Bugdom2Globals, OttoGlobals } from "@/data/globals/globals";
import {
  addBehaviorDefinition,
  addScriptParam,
  applyGlobalBehavior,
  applyTerrainBehavior,
  buildPreviewScriptFiles,
  buildScriptPackageFiles,
  buildScriptPackageZip,
  compileScriptWorkspace,
  createCustomObjectFromBehavior,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  importScriptPackageZip,
  loadScriptSample,
  placeCustomObject,
  removeCustomPlacement,
  upsertScriptSourceFile,
} from "@/editor/subviews/scripts/scriptWorkspaceState";
import {
  getScriptAllowedTags,
  getScriptBehaviorOptions,
  getScriptCustomObjectOptions,
  getScriptParamOptions,
  getScriptSourcePathOptions,
  summarizeScriptWorkspace,
} from "@/editor/subviews/scripts/scriptWorkspaceSelectors";

function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes));
}

describe("scriptWorkspaceState", () => {
  it("builds preview files for the Otto humans jump sample", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 3);
    const state = loadScriptSample(context, "otto-humans-jump");

    const previewFilesResult = buildPreviewScriptFiles(state);

    expect(previewFilesResult.isOk()).toBe(true);
    if (previewFilesResult.isErr()) {
      return;
    }

    const filePaths = previewFilesResult.value.map((file) => file.path);
    expect(filePaths).toContain("/Data/Scripts/config/levels.json");
    expect(filePaths).toContain("/Data/Scripts/dist/main.js");
    expect(filePaths).toContain("/Data/Scripts/types/pangea-runtime.d.ts");
    expect(filePaths).toContain("/Data/Scripts/types/pangea-games.d.ts");
    expect(filePaths).toContain(
      "/Data/Scripts/src/globals/otto-humans-jump.ts",
    );

    const levelsFile = previewFilesResult.value.find(
      (file) => file.path === "/Data/Scripts/config/levels.json",
    );
    expect(levelsFile).toBeDefined();
    if (!levelsFile) {
      return;
    }

    const levelsJson = decodeJson(levelsFile.data);
    expect(levelsJson).toEqual({
      version: 1,
      levels: {
        "3": {
          script: "Data/Scripts/dist/main.js",
          extraNativeItems: [],
          itemOverrides: [],
        },
      },
    });

    const bundleFile = previewFilesResult.value.find(
      (file) => file.path === "/Data/Scripts/dist/main.js",
    );
    expect(bundleFile).toBeDefined();
    if (!bundleFile) {
      return;
    }

    const bundleText = new TextDecoder().decode(bundleFile.data);
    expect(bundleText).toContain("function onObjectFrame");
    expect(bundleText).toContain("ottomatic.human");
    expect(bundleText).toContain("levelTimeSeconds * 8");

    const runtimeTypesFile = previewFilesResult.value.find(
      (file) => file.path === "/Data/Scripts/types/pangea-runtime.d.ts",
    );
    expect(runtimeTypesFile).toBeDefined();
    if (!runtimeTypesFile) {
      return;
    }

    const runtimeTypesText = new TextDecoder().decode(runtimeTypesFile.data);
    expect(runtimeTypesText).toContain('declare module "pangea"');
    expect(runtimeTypesText).toContain("declare global");
  });

  it("exports terrain bindings into the bindings sidecar", () => {
    const context = createScriptWorkspaceContext(Bugdom2Globals, 2);
    let state = ensureScriptWorkspace({}, context);

    state = applyTerrainBehavior(
      state,
      "sample.item-trigger-logger",
      "Health Item",
      {
        itemType: 12,
        position: { x: 100, y: 0, z: 200 },
        flags: 0,
        params: [1, 2, 3, 4],
      },
    );

    const packageFilesResult = buildScriptPackageFiles(state);

    expect(packageFilesResult.isOk()).toBe(true);
    if (packageFilesResult.isErr()) {
      return;
    }

    const bindingsFile = packageFilesResult.value.find((file) =>
      file.path.endsWith("Data/Scripts/config/bindings/level-2.json"),
    );
    expect(bindingsFile).toBeDefined();
    if (!bindingsFile) {
      return;
    }

    const bindingsJson = decodeJson(bindingsFile.bytes);
    expect(bindingsJson).toEqual({
      schemaVersion: 1,
      terrainBindings: [
        {
          id: "terrain-sample-item-trigger-logger-12-100-200",
          behaviorId: "sample.item-trigger-logger",
          label: "Health Item",
          sourceFilePath:
            "Data/Scripts/src/bindings/terrain-sample-item-trigger-logger-12-100-200.ts",
          tags: [],
          paramRefs: [],
          compatibility: "preview-ready",
          kind: "terrainItem",
          signature: {
            itemType: 12,
            position: { x: 100, y: 0, z: 200 },
            flags: 0,
            params: [1, 2, 3, 4],
          },
        },
      ],
      splineBindings: [],
      mapItemBindings: [],
    });
  });

  it("round-trips an extended script package through zip import", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const state = loadScriptSample(context, "hover-beacon");

    const zipResult = buildScriptPackageZip(state);
    expect(zipResult.isOk()).toBe(true);
    if (zipResult.isErr()) {
      return;
    }

    const importedResult = importScriptPackageZip(zipResult.value, context);
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) {
      return;
    }

    expect(importedResult.value.customObjects).toHaveLength(1);
    expect(
      importedResult.value.levels[context.levelKey]?.customPlacements,
    ).toHaveLength(1);
    expect(importedResult.value.sampleId).toBe("hover-beacon");
  });

  it("rejects JavaScript source files from imported script packages", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const zipBytes = zipSync({
      "Data/Scripts/src/bad.js": strToU8(
        "exports.onLevelStart = function() {};",
      ),
    });

    const importedResult = importScriptPackageZip(zipBytes, context);

    expect(importedResult.isErr()).toBe(true);
    if (importedResult.isOk()) {
      return;
    }
    expect(importedResult.error).toContain(
      "Script source files must be TypeScript",
    );
  });

  it("marks custom-object workspaces as extended", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const state = loadScriptSample(context, "hover-beacon");

    expect(summarizeScriptWorkspace(state)).toMatchObject({
      hasScripts: true,
      hasExtendedFeatures: true,
    });
  });

  it("reports a warning for external require paths", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    state = upsertScriptSourceFile(
      state,
      "Data/Scripts/src/external.ts",
      [
        "const helper = require('unsupported-package');",
        "export function onLevelStart(ctx: LevelContext): void {",
        "  pangea.log.info(String(Boolean(helper)));",
        "}",
      ].join("\n"),
    );

    const compileResult = compileScriptWorkspace(state);
    expect(compileResult.isOk()).toBe(true);
    if (compileResult.isErr()) {
      return;
    }

    expect(
      compileResult.value.diagnostics.some(
        (diagnostic) => diagnostic.code === "preview.require",
      ),
    ).toBe(true);
  });

  it("adds user-defined behaviors to the catalog", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    state = addBehaviorDefinition(state, {
      target: "terrainItem",
      hooks: ["onTerrainItem"],
      id: "test.custom-behavior",
      label: "Custom Test Behavior",
      description: "A test behavior",
      tags: ["test"],
      sourceFilePath: "Data/Scripts/src/bindings/test-custom-behavior.ts",
      sourceTemplate:
        "export function onTerrainItem(ctx: any): any { return { shouldSpawn: true }; }",
    });

    expect(state.behaviorCatalog.length).toBeGreaterThan(0);
    const addedBehavior = state.behaviorCatalog.find(
      (b) => b.id === "test.custom-behavior",
    );
    expect(addedBehavior).toBeDefined();
    expect(addedBehavior?.label).toBe("Custom Test Behavior");
    expect(addedBehavior?.supportedHooks).toContain("onTerrainItem");

    // Check that source file was created
    const sourceFilePath = addedBehavior?.sourceFilePath;
    expect(sourceFilePath).toBeDefined();
    if (sourceFilePath) {
      const sourceFile = state.sourceFiles[sourceFilePath];
      expect(sourceFile).toBeDefined();
      expect(sourceFile?.content).toContain("shouldSpawn");
    }
  });

  it("applies global hooks and includes them in sidecars", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    // First add a global behavior definition
    state = addBehaviorDefinition(state, {
      target: "global",
      hooks: ["onLevelLoad"],
      id: "test-logger",
      label: "Test Logger",
      description: "Test global hook",
      tags: [],
      sourceFilePath: "Data/Scripts/src/globals/test-logger.ts",
      sourceTemplate:
        "export function onLevelLoad(ctx: GlobalContext): void { console.log('test'); }",
    });

    // Then apply it
    state = applyGlobalBehavior(state, "onLevelLoad", "test-logger");

    const levelState = state.levels[context.levelKey];
    expect(levelState?.globalHooks.length).toBeGreaterThan(0);
    expect(levelState?.globalHooks[0]?.hookId).toBe("onLevelLoad");
  });

  it("creates and manages custom object placements", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    state = placeCustomObject(state, "test-object", "Test Object", {
      x: 100,
      y: 0,
      z: 200,
    });

    const levelState = state.levels[context.levelKey];
    expect(levelState?.customPlacements.length).toBe(1);
    expect(levelState?.customPlacements[0]?.objectId).toBe("test-object");
    expect(levelState?.customPlacements[0]?.position.x).toBe(100);

    // Test removal
    const placementId = levelState?.customPlacements[0]?.id;
    if (placementId) {
      state = removeCustomPlacement(state, placementId);
      const updatedLevel = state.levels[context.levelKey];
      expect(updatedLevel?.customPlacements.length).toBe(0);
    }
  });

  it("includes custom placements in exported sidecar files", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    state = placeCustomObject(state, "test-object", "Test Placement", {
      x: 50,
      y: 10,
      z: 75,
    });

    const packageFilesResult = buildScriptPackageFiles(state);
    expect(packageFilesResult.isOk()).toBe(true);
    if (packageFilesResult.isErr()) {
      return;
    }

    const placementsFile = packageFilesResult.value.find((file) =>
      file.path.includes("placements/level-"),
    );
    expect(placementsFile).toBeDefined();
    if (!placementsFile) {
      return;
    }

    const placementsJson = decodeJson(placementsFile.bytes);
    expect(placementsJson).toHaveProperty("schemaVersion", 1);
    expect(placementsJson).toHaveProperty("placements");
    const placements = (placementsJson as any).placements;
    expect(Array.isArray(placements)).toBe(true);
    expect(placements.length).toBeGreaterThan(0);
    expect(placements[0]).toMatchObject({
      objectId: "test-object",
      position: { x: 50, y: 10, z: 75 },
    });
  });

  it("builds valid scripting option lists from workspace state", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 2);
    let state = ensureScriptWorkspace({}, context);

    state = addBehaviorDefinition(state, {
      target: "global",
      hooks: ["onLevelLoad"],
      id: "test-global",
      label: "Test Global",
      description: "Global option builder test",
      tags: [],
      sourceFilePath: "Data/Scripts/src/globals/test-global.ts",
      sourceTemplate: "export function onLevelLoad(ctx: LevelContext): void {}",
    });
    state = addScriptParam(state, {
      id: "editor.speed",
      label: "Speed",
      type: "number",
      description: "Speed parameter",
      defaultValue: "1",
    });
    state = createCustomObjectFromBehavior(
      state,
      "sample.hover-beacon",
      "test-object",
      "Test Object",
    );

    expect(
      getScriptBehaviorOptions(state, "global", "onLevelLoad").map(
        (behavior) => behavior.id,
      ),
    ).toContain("test-global");
    expect(getScriptSourcePathOptions(state)).toContain(
      "Data/Scripts/src/globals/test-global.ts",
    );
    expect(getScriptParamOptions(state).map((param) => param.id)).toContain(
      "editor.speed",
    );
    expect(
      getScriptCustomObjectOptions(state).map(
        (objectDefinition) => objectDefinition.id,
      ),
    ).toContain("test-object");
  });

  it("includes contributed tags in allowed tag options", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const state = loadScriptSample(context, "hover-beacon");

    expect(
      getScriptAllowedTags(state).some(
        (tag) => tag.id === "editor.custom.hoverBeacon",
      ),
    ).toBe(true);
  });
});
