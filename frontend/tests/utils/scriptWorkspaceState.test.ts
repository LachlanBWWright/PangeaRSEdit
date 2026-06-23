import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  BillyFrontierGlobals,
  BugdomGlobals,
  Bugdom2Globals,
  CroMagGlobals,
  MightyMikeGlobals,
  NanosaurGlobals,
  Nanosaur2Globals,
  OttoGlobals,
} from "@/data/globals/globals";
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
import { buildScriptTypeDeclarationFiles } from "@/editor/subviews/scripts/scriptTypeDeclarations";
import { validateScriptPackage } from "@/editor/subviews/scripts/scriptPackageValidator";

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
    expect(filePaths).toContain("/Data/Scripts/dist/main.lua");
    expect(filePaths).toContain("/Data/Scripts/types/pangea-runtime.lua");
    expect(filePaths).toContain("/Data/Scripts/types/pangea-games.lua");
    expect(filePaths).toContain(
      "/Data/Scripts/src/globals/otto-humans-jump.lua",
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
          script: "Data/Scripts/dist/main.lua",
          extraNativeItems: [],
          itemOverrides: [],
          levelSettings: {},
        },
      },
    });

    const bundleFile = previewFilesResult.value.find(
      (file) => file.path === "/Data/Scripts/dist/main.lua",
    );
    expect(bundleFile).toBeDefined();
    if (!bundleFile) {
      return;
    }

    const bundleText = new TextDecoder().decode(bundleFile.data);
    expect(bundleText).toContain("local entry = {}");
    expect(bundleText).toContain("otto_humans_jump");
    expect(bundleText).toContain(
      'require("./globals/otto-humans-jump.lua")',
    );
    expect(bundleText).not.toContain("local bundled =");

    const humansJumpFile = previewFilesResult.value.find(
      (file) =>
        file.path === "/Data/Scripts/src/globals/otto-humans-jump.lua",
    );
    expect(humansJumpFile).toBeDefined();
    if (!humansJumpFile) {
      return;
    }
    expect(new TextDecoder().decode(humansJumpFile.data)).toContain(
      "ctx.levelTimeSeconds",
    );

    const runtimeTypesFile = previewFilesResult.value.find(
      (file) => file.path === "/Data/Scripts/types/pangea-runtime.lua",
    );
    expect(runtimeTypesFile).toBeDefined();
    if (!runtimeTypesFile) {
      return;
    }

    const runtimeTypesText = new TextDecoder().decode(runtimeTypesFile.data);
    expect(runtimeTypesText).toContain("---@class PangeaApi");
    expect(runtimeTypesText).toContain("pangea =");
  });

  it("emits game-aware Lua annotations for the active scripting context", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 3);
    const state = loadScriptSample(context, "otto-humans-jump");

    const declarationFiles = buildScriptTypeDeclarationFiles(state);
    const runtimeDeclaration = declarationFiles.find(
      (file) => file.path === "Data/Scripts/types/pangea-runtime.lua",
    );

    expect(runtimeDeclaration).toBeDefined();
    if (!runtimeDeclaration) {
      return;
    }

    expect(runtimeDeclaration.content).toContain("---@class LevelContext");
    expect(runtimeDeclaration.content).toContain("---@field levelNum number");
    expect(runtimeDeclaration.content).toContain("---@field playerMode string|nil");
    expect(runtimeDeclaration.content).toContain("---@field info fun(message: string)");
    expect(runtimeDeclaration.content).toContain("---@field position fun(handle: ObjectHandle): Vector3|nil");
  });

  it("uses game-specific hook sets for adventure and area-based games", () => {
    const nanosaurContext = createScriptWorkspaceContext(NanosaurGlobals, 3);
    expect(nanosaurContext.supportedHooks).toContain("onTerrainItem");
    expect(nanosaurContext.supportedHooks).not.toContain("onSplineItem");

    const billyContext = createScriptWorkspaceContext(BillyFrontierGlobals, 1);
    expect(billyContext.supportedHooks).toContain("onAreaStart");
    expect(billyContext.supportedHooks).toContain("onAreaFrame");
    expect(billyContext.supportedHooks).not.toContain("onLevelStart");
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
            "Data/Scripts/src/bindings/terrain-sample-item-trigger-logger-12-100-200.lua",
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

  it("rejects non-Lua source files from imported script packages", () => {
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
      "Script source files must be Lua",
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
      "Data/Scripts/src/external.lua",
      [
        "local helper = require('unsupported-package')",
        "local module = {}",
        "function module.onLevelStart(ctx)",
        "  pangea.log.info(tostring(helper))",
        "end",
        "return module",
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
      sourceFilePath: "Data/Scripts/src/bindings/test-custom-behavior.lua",
      sourceTemplate:
        "local module = {}\nfunction module.onTerrainItem(ctx)\n  return { shouldSpawn = true }\nend\nreturn module",
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

  it("generates object-type dispatch without adding type checks to user modules", () => {
    const context = createScriptWorkspaceContext(BugdomGlobals, 1);
    let state = ensureScriptWorkspace({}, context);

    state = addBehaviorDefinition(state, {
      target: "objectType",
      hooks: ["onObjectFrame"],
      id: "test.player-frame",
      label: "Player Frame",
      description: "Runs only for the player object type",
      tags: [],
      objectType: "bugdom.player",
      sourceFilePath: "Data/Scripts/src/objects/player-frame.lua",
      sourceTemplate:
        "local module = {}\nfunction module.onObjectFrame(ctx)\n  return { positionOffset = { x = 0, y = 1, z = 0 } }\nend\nreturn module",
    });

    const compileResult = compileScriptWorkspace(state);
    expect(compileResult.isOk()).toBe(true);
    if (compileResult.isErr()) {
      return;
    }

    const bundle =
      compileResult.value.compiledFiles["Data/Scripts/dist/main.lua"]?.content;
    expect(bundle).toContain('["bugdom.player"]');
    expect(bundle).toContain("__objectTypeModules[ctx.objectType]");
    expect(bundle).toContain("__module_Data_Scripts_src_objects_player_frame_lua");
    expect(
      compileResult.value.sourceFiles[
        "Data/Scripts/src/objects/player-frame.lua"
      ]?.content,
    ).not.toContain("bugdom.player");
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
      sourceFilePath: "Data/Scripts/src/globals/test-logger.lua",
      sourceTemplate:
        "local module = {}\nfunction module.onLevelLoad(ctx)\n  pangea.log.info('test')\nend\nreturn module",
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
      sourceFilePath: "Data/Scripts/src/globals/test-global.lua",
      sourceTemplate: "local module = {}\nfunction module.onLevelLoad(ctx)\nend\nreturn module",
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
      "Data/Scripts/src/globals/test-global.lua",
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

  it("compiles and validates Lua script templates for all 8 games", () => {
    const gameCases = [
      { globals: OttoGlobals, sample: "otto-humans-jump", level: 3 },
      { globals: BugdomGlobals, sample: "bugdom-bouncing-friends", level: 2 },
      { globals: Bugdom2Globals, sample: "bugdom2-clover-bob", level: 2 },
      { globals: CroMagGlobals, sample: "cromag-bouncing-pickups", level: 1 },
      { globals: NanosaurGlobals, sample: "nanosaur-hover-eggs", level: 1 },
      { globals: Nanosaur2Globals, sample: "nanosaur2-powerup-spin", level: 3 },
      { globals: BillyFrontierGlobals, sample: "billy-cacti-bounce", level: 1 },
      { globals: MightyMikeGlobals, sample: "mightymike-box-bob", level: 1 },
    ];

    for (const { globals, sample, level } of gameCases) {
      const context = createScriptWorkspaceContext(globals, level);
      const state = loadScriptSample(context, sample);

      const compileResult = compileScriptWorkspace(state);
      expect(compileResult.isOk()).toBe(true);
      if (compileResult.isErr()) {
        continue;
      }

      const diagnostics = compileResult.value.diagnostics;
      const errors = diagnostics.filter((d) => d.severity === "error");
      expect(errors).toHaveLength(0);

      const packageFilesResult = buildScriptPackageFiles(compileResult.value);
      expect(packageFilesResult.isOk()).toBe(true);
      if (packageFilesResult.isErr()) {
        continue;
      }

      const filesMap: Record<string, Uint8Array> = {};
      for (const file of packageFilesResult.value) {
        filesMap[file.path] = file.bytes;
      }

      const validationResult = validateScriptPackage(filesMap, context);
      expect(validationResult.isOk()).toBe(true);
    }
  });
});
