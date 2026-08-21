import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import { z } from "zod";
import { Document, WebIO } from "@gltf-transform/core";
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
  addScriptAsset,
  addScriptParam,
  applyGlobalBehavior,
  applyTerrainBehavior,
  buildPreviewScriptFiles,
  buildPreviewScriptFilesAsync,
  buildScriptPackageFiles,
  buildScriptPackageZip,
  buildScriptPackageZipAsync,
  compileScriptWorkspace,
  createCustomObjectFromBehavior,
  createScriptWorkspaceContext,
  ensureScriptWorkspace,
  importScriptPackageZip,
  importScriptPackageZipAsync,
  loadScriptSample,
  placeCustomObject,
  replaceMapItemWithCustomObject,
  removeCustomPlacement,
  retargetScriptWorkspace,
  upsertScriptSourceFile,
  updateCustomObjectDefinition,
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
import {
  SCRIPT_PACKAGE_MANIFEST_PATH,
  validateScriptPackageForNetwork,
  validateScriptPackage,
} from "@/editor/subviews/scripts/scriptPackageValidator";
import { scriptProjectSchema } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import {
  CAPABILITY_MATRIX,
  getWorkspaceWarnings,
} from "@/editor/subviews/scripts/scriptCapabilityMatrix";
import { convertGltfAsset } from "@/editor/subviews/scripts/scriptAssetConversion";

const PlacementsFileSchema = z.object({
  schemaVersion: z.literal(1),
  placements: z.array(z.object({
    objectId: z.string(),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  })),
});

function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function createScriptFixtureGlb(): Promise<Uint8Array> {
  const document = new Document();
  const buffer = document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute(
      "POSITION",
      document
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
        .setBuffer(buffer),
    );
  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);
  return new Uint8Array(await new WebIO().writeBinary(document));
}

describe("scriptWorkspaceState", () => {
  it("advertises implemented core runtime capabilities for every game", () => {
    for (const capabilities of Object.values(CAPABILITY_MATRIX)) {
      expect(capabilities.nativeSpawn).toBe("supported");
      expect(capabilities.scriptedSpawn).toBe("supported");
      expect(capabilities.playerLookup).toBe("supported");
      expect(capabilities.levelMetadata).toBe("supported");
      expect(capabilities.timeAPIs).toBe("supported");
    }
  });

  it("warns before preview when a custom object asset is missing", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const sample = loadScriptSample(context, "hover-beacon");
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    const state = updateCustomObjectDefinition(sample, {
      ...definition,
      visual: {
        kind: "customDisplayGroup",
        modelPath: "Data/Scripts/assets/models/missing.bg3d",
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    });

    expect(getWorkspaceWarnings(state)).toContain(
      "Custom object 'Hover Beacon' requires asset 'Data/Scripts/assets/models/missing.bg3d' before preview/export.",
    );
  });

  it("rejects malformed model assets before synchronous export", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const sample = loadScriptSample(context, "hover-beacon");
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    const modelPath = "Data/Scripts/assets/models/malformed.bg3d";
    const withDefinition = updateCustomObjectDefinition(sample, {
      ...definition,
      visual: {
        kind: "customDisplayGroup",
        modelPath,
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    });
    const state = addScriptAsset(
      withDefinition,
      modelPath,
      new Uint8Array([0x42, 0x47, 0x33, 0x44]),
      "malformed.bg3d",
    );

    const result = buildScriptPackageFiles(state);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("Custom asset validation failed");
    }
  });

  it("builds preview files for the Otto humans jump sample", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 3);
    const state = loadScriptSample(context, "otto-humans-jump");

    const previewFilesResult = buildPreviewScriptFiles(state);
    const packageFilesResult = buildScriptPackageFiles(state);

    expect(previewFilesResult.isOk()).toBe(true);
    expect(packageFilesResult.isOk()).toBe(true);
    if (previewFilesResult.isErr()) {
      return;
    }
    if (packageFilesResult.isErr()) {
      return;
    }

    const packageFiles = new Map(
      packageFilesResult.value.map((file) => [file.path, file.bytes]),
    );
    for (const previewFile of previewFilesResult.value) {
      const packageFile = packageFiles.get(previewFile.path.slice(1));
      expect(packageFile).toEqual(previewFile.data);
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
          customObjects: [],
          terrainReplacements: [],
          mapReplacements: [],
          splineReplacements: [],
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
    expect(runtimeDeclaration.content).toContain("---@class CustomObjectBehavior");
    expect(runtimeDeclaration.content).toContain(
      '---@field onAnimationEvent fun(self: ObjectBehaviorSelf, ctx: AnimationMarkerObjectFrameContext)|nil',
    );
    expect(runtimeDeclaration.content).toContain(
      '---@field onAnimationComplete fun(self: ObjectBehaviorSelf, ctx: AnimationCompleteObjectFrameContext)|nil',
    );
    expect(runtimeDeclaration.content).toContain('---@field eventValue nil');
    expect(runtimeDeclaration.content).toContain(
      "---@field onCheckpointReset fun(self: ObjectBehaviorSelf, ctx: ObjectFrameContext)|nil",
    );
    expect(runtimeDeclaration.content).toContain("---@field levelNum number");
    expect(runtimeDeclaration.content).toContain("---@field playerMode string|nil");
    expect(runtimeDeclaration.content).toContain("---@field info fun(message: string)");
    expect(runtimeDeclaration.content).toContain("---@field position fun(handle: ObjectHandle): Vector3|nil");
    expect(runtimeDeclaration.content).toContain("---@field setPositionResult fun(handle: ObjectHandle, position: Vector3): ObjectCommandResult");
    expect(runtimeDeclaration.content).toContain("---@field deleteResult fun(handle: ObjectHandle): ObjectCommandResult");
    expect(runtimeDeclaration.content).toContain("---@field source fun(handle: ObjectHandle): ObjectSource|nil");
    expect(runtimeDeclaration.content).toContain("---@field kind \"terrain\"|\"spline\"|\"map\"");
    expect(runtimeDeclaration.content).toContain("---@class PangeaCapabilities");
    expect(runtimeDeclaration.content).toContain("---@field current fun(): integer");
    expect(runtimeDeclaration.content).toContain("---@field frame fun(): integer");
    expect(runtimeDeclaration.content).toContain("---@field after fun(delaySeconds: number");
    expect(runtimeDeclaration.content).toContain("---@field diagnostics fun(): PangeaDiagnostics");
    expect(runtimeDeclaration.content).toContain("---@class PangeaPlayerSnapshot");
    expect(runtimeDeclaration.content).toContain("---@field get fun(playerNum: integer): PangeaPlayerSnapshot|nil");
    expect(runtimeDeclaration.content).toContain("---@field player ObjectHandle|nil");
    expect(runtimeDeclaration.content).toContain("---@field other ObjectHandle|nil");
    expect(runtimeDeclaration.content).toContain('---@field reason "ok"|"not-enabled"');
    expect(runtimeDeclaration.content).toContain(
      "---@alias NativeSpawnId",
    );
    expect(runtimeDeclaration.content).toContain(
      '---| "ottomatic.teleporter" # Teleporter:',
    );
    expect(runtimeDeclaration.content).toContain(
      "---@overload fun(id: NativeSpawnId",
    );
  });

  it("emits documented native spawn IDs for every game", () => {
    const games = [
      { globals: BugdomGlobals, expectedIds: ["bugdom.nut", "bugdom.clover", "bugdom.checkpoint"] },
      { globals: Bugdom2Globals, expectedIds: ["bugdom2.powerup", "bugdom2.dcell", "bugdom2.gliderPart"] },
      { globals: NanosaurGlobals, expectedIds: ["nanosaur.powerup", "nanosaur.egg", "nanosaur.crystal"] },
      { globals: Nanosaur2Globals, expectedIds: ["nanosaur2.egg", "nanosaur2.weaponPow", "nanosaur2.healthPow"] },
      { globals: CroMagGlobals, expectedIds: ["cromag.pow", "cromag.token", "cromag.stickyTiresPow", "cromag.suspensionPow", "cromag.invisibilityPow"] },
      { globals: BillyFrontierGlobals, expectedIds: ["billy.peso", "billy.freeLifePow", "billy.boost"] },
      { globals: MightyMikeGlobals, expectedIds: ["mightymike.bunny", "mightymike.healthPow", "mightymike.key"] },
    ];

    for (const game of games) {
      const context = createScriptWorkspaceContext(game.globals, 1);
      const state = ensureScriptWorkspace({}, context);
      const declaration = buildScriptTypeDeclarationFiles(state).find(
        (file) => file.path === "Data/Scripts/types/pangea-runtime.lua",
      );
      expect(declaration).toBeDefined();
      for (const id of game.expectedIds) {
        expect(declaration?.content).toContain(`---| "${id}" #`);
      }
    }
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

  it("round-trips bindings and placements for every authored level", () => {
    const firstContext = createScriptWorkspaceContext(OttoGlobals, 1);
    const secondContext = createScriptWorkspaceContext(OttoGlobals, 2);
    let state = ensureScriptWorkspace({}, firstContext);
    state = applyTerrainBehavior(
      state,
      "sample.item-trigger-logger",
      "Level one item",
      {
        itemType: 12,
        position: { x: 10, y: 0, z: 20 },
        flags: 0,
        params: [0, 0, 0, 0],
      },
    );
    state = retargetScriptWorkspace(state, secondContext);
    state = applyTerrainBehavior(
      state,
      "sample.item-trigger-logger",
      "Level two item",
      {
        itemType: 12,
        position: { x: 30, y: 0, z: 40 },
        flags: 0,
        params: [0, 0, 0, 0],
      },
    );
    state = upsertScriptSourceFile(
      state,
      "Data/Scripts/src/bindings/item-trigger.lua",
      "return {}",
    );

    const packageResult = buildScriptPackageZip(state);
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;
    const importedResult = importScriptPackageZip(
      packageResult.value,
      firstContext,
    );
    expect(
      importedResult.isOk(),
      importedResult.isErr() ? importedResult.error : "",
    ).toBe(true);
    if (importedResult.isErr()) return;

    expect(importedResult.value.levels["1"]?.terrainBindings).toHaveLength(1);
    expect(importedResult.value.levels["2"]?.terrainBindings).toHaveLength(2);
    expect(importedResult.value.levels["1"]?.terrainBindings[0]?.label).toBe(
      "Level one item",
    );
    expect(
      importedResult.value.levels["2"]?.terrainBindings.map((binding) => binding.label),
    ).toEqual(expect.arrayContaining(["Level one item", "Level two item"]));
  });

  it("rejects a package that drops a declared level sidecar", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const packageResult = buildScriptPackageFiles(loadScriptSample(context, "hover-beacon"));
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;

    const files = Object.fromEntries(
      packageResult.value.map((file) => [file.path, file.bytes]),
    );
    delete files["Data/Scripts/config/bindings/level-4.json"];

    const validationResult = validateScriptPackage(files, context, {
      assetsPrevalidated: true,
    });
    expect(validationResult.isErr()).toBe(true);
    if (validationResult.isOk()) return;
    expect(validationResult.error).toContain(
      "Missing Data/Scripts/config/bindings/level-4.json",
    );
  });

  it("rejects tampered packages using the deterministic package manifest", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const packageResult = buildScriptPackageFiles(loadScriptSample(context, "hover-beacon"));
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;

    const files: Record<string, Uint8Array> = Object.fromEntries(
      packageResult.value.map((file) => [file.path, file.bytes]),
    );
    expect(files[SCRIPT_PACKAGE_MANIFEST_PATH]).toBeDefined();
    const bundle = files["Data/Scripts/dist/main.lua"];
    expect(bundle).toBeDefined();
    if (!bundle) return;
    files["Data/Scripts/dist/main.lua"] = Uint8Array.from([
      ...bundle,
      0x20,
    ]);

    const validationResult = validateScriptPackage(files, context);
    expect(validationResult.isErr()).toBe(true);
    if (validationResult.isOk()) return;
    expect(validationResult.error).toContain("content hash mismatch");
  });

  it("keeps networked scripting behind an explicit deterministic-runtime gate", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const packageResult = buildScriptPackageFiles(loadScriptSample(context, "hover-beacon"));
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;

    const files: Record<string, Uint8Array> = Object.fromEntries(
      packageResult.value.map((file) => [file.path, file.bytes]),
    );
    const validationResult = validateScriptPackageForNetwork(files, context);
    expect(validationResult.isErr()).toBe(true);
    if (validationResult.isOk()) return;
    expect(validationResult.error).toContain("Networked scripting is disabled");
  });

  it("round-trips binary BG3D assets referenced by custom objects", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const sample = loadScriptSample(context, "hover-beacon");
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    const modelPath = "Data/Scripts/assets/models/beacon.bg3d";
    const withDefinition = updateCustomObjectDefinition(sample, {
      ...definition,
      visual: {
        kind: "customDisplayGroup",
        modelPath,
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    });
    const state = addScriptAsset(
      withDefinition,
      modelPath,
      new Uint8Array(
        readFileSync(
          join(
            __dirname,
            "../../public/games/ottomatic/skeletons/GiantLizard.bg3d",
          ),
        ),
      ),
      "beacon.bg3d",
    );
    const sourcePath = "Data/Scripts/assets/source/beacon.glb";
    const sourceBytes = await createScriptFixtureGlb();
    const stateWithSource = addScriptAsset(
      state,
      sourcePath,
      sourceBytes,
      "beacon.glb",
    );
    const zipResult = await buildScriptPackageZipAsync(stateWithSource);
    expect(zipResult.isOk()).toBe(true);
    if (zipResult.isErr()) return;

    const importedResult = await importScriptPackageZipAsync(
      zipResult.value,
      context,
    );
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) return;
    expect(importedResult.value.assets[modelPath]?.bytes).toEqual(
      new Uint8Array(
        readFileSync(
          join(
            __dirname,
            "../../public/games/ottomatic/skeletons/GiantLizard.bg3d",
          ),
        ),
      ),
    );
    expect(importedResult.value.assets[sourcePath]?.bytes).toEqual(sourceBytes);
  });

  it("exports, previews, and asynchronously re-imports a converted glTF asset", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const sample = loadScriptSample(context, "hover-beacon");
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    const sourcePath = "Data/Scripts/assets/source/crate.glb";
    const runtimePath = "Data/Scripts/assets/models/crate-glb.bg3d";
    const sourceBytes = await createScriptFixtureGlb();
    const conversion = await convertGltfAsset("crate.glb", sourceBytes);
    expect(conversion.isOk()).toBe(true);
    if (conversion.isErr()) return;

    const withDefinition = updateCustomObjectDefinition(sample, {
      ...definition,
      visual: {
        kind: "customDisplayGroup",
        modelPath: runtimePath,
        modelObject: 0,
        scale: 1,
        slot: 450,
      },
    });
    const withRuntime = addScriptAsset(
      withDefinition,
      runtimePath,
      conversion.value.nativeBytes,
      "crate.glb",
    );
    const state = addScriptAsset(
      withRuntime,
      sourcePath,
      sourceBytes,
      "crate.glb",
    );

    const packageResult = await buildScriptPackageZipAsync(state);
    if (packageResult.isErr()) {
      expect.fail(packageResult.error);
      return;
    }

    const previewResult = await buildPreviewScriptFilesAsync(state);
    expect(previewResult.isOk()).toBe(true);
    if (previewResult.isErr()) return;
    const previewRuntime = previewResult.value.find(
      (file) => file.path === `/${runtimePath}`,
    );
    expect(previewRuntime?.data).toEqual(conversion.value.nativeBytes);

    const importedResult = await importScriptPackageZipAsync(
      packageResult.value,
      context,
    );
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) return;
    expect(importedResult.value.assets[runtimePath]?.bytes).toEqual(
      conversion.value.nativeBytes,
    );
    expect(importedResult.value.assets[sourcePath]?.bytes).toEqual(sourceBytes);
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
      "Legacy TypeScript/JavaScript package detected",
    );
  });

  it("reports the legacy migration path for TypeScript packages", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const zipBytes = zipSync({
      "Data/Scripts/src/legacy.ts": strToU8(
        "export function onLevelStart(): void {}",
      ),
    });

    const importedResult = importScriptPackageZip(zipBytes, context);

    expect(importedResult.isErr()).toBe(true);
    if (importedResult.isOk()) return;
    expect(importedResult.error).toContain(
      "Legacy TypeScript/JavaScript package detected",
    );
    expect(importedResult.error).toContain("Lua 5.4");
  });

  it("marks custom-object workspaces as extended", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const state = loadScriptSample(context, "hover-beacon");

    expect(summarizeScriptWorkspace(state)).toMatchObject({
      hasScripts: true,
      hasExtendedFeatures: true,
    });
  });

  it("routes custom object frames to the definition behavior", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const state = loadScriptSample(context, "hover-beacon");
    const compileResult = compileScriptWorkspace(state);

    expect(compileResult.isOk()).toBe(true);
    if (compileResult.isErr()) {
      return;
    }

    const bundle =
      compileResult.value.compiledFiles["Data/Scripts/dist/main.lua"]?.content;
    expect(state.customObjects[0]).toMatchObject({
      id: "sample.hoverBeacon",
      visual: {
        kind: "nativeDisplayGroup",
        group: "global",
        modelObject: 1,
        scale: 1.8,
        slot: 450,
      },
    });
    expect(state.levels[context.levelKey]?.customPlacements[0]).toMatchObject({
      objectId: "sample.hoverBeacon",
      position: { x: 0, y: 160, z: 0 },
    });
    expect(bundle).toContain('pangea.spawn.scripted("sample.hoverBeacon"');
    expect(bundle).toContain('ctx.objectType == "sample.hoverBeacon"');
    expect(bundle).not.toContain(
      '__hasTag(ctx.tags, "editor.custom.hoverBeacon")',
    );
    expect(
      state.sourceFiles["Data/Scripts/src/objects/sample-hoverbeacon.lua"]
        ?.content,
    ).toContain("math.sin(ctx.levelTimeSeconds * 4) * 16");
    expect(
      state.sourceFiles["Data/Scripts/src/objects/sample-hoverbeacon.lua"]
        ?.content,
    ).toContain("pangea.object.setRotation");
    expect(bundle).toContain("handler({ handle = ctx.object }, ctx)");
    expect(bundle).toContain('["animationEvent"] = "onAnimationEvent"');
    expect(bundle).toContain('["animationComplete"] = "onAnimationComplete"');
    expect(bundle).toContain('["triggerEnter"] = "onTriggerEnter"');
    expect(bundle).toContain('["activate"] = "onActivate"');
    expect(bundle).toContain('["deactivate"] = "onDeactivate"');
    expect(bundle).toContain('["streamIn"] = "onStreamIn"');
    expect(bundle).toContain('["streamOut"] = "onStreamOut"');
    expect(bundle).toContain('["checkpointReset"] = "onCheckpointReset"');
  });

  it("exports semantic collision bounds with custom objects", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 4);
    const sample = loadScriptSample(context, "hover-beacon");
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;

    const state = updateCustomObjectDefinition(sample, {
      ...definition,
      collision: {
        kind: "preset",
        preset: "triggerBox",
        bounds: { width: 2, height: 3, depth: 4 },
      },
    });
    const packageResult = buildScriptPackageFiles(state);
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;

    const levelsBytes = packageResult.value.find(
      (file) => file.path === "Data/Scripts/config/levels.json",
    )?.bytes;
    expect(levelsBytes).toBeDefined();
    if (!levelsBytes) return;
    const levels = decodeJson(levelsBytes);
    expect(levels).toMatchObject({
      levels: {
        "4": {
          customObjects: [
            {
              collision: {
                kind: "preset",
                preset: "triggerBox",
                bounds: { width: 2, height: 3, depth: 4 },
              },
            },
          ],
        },
      },
    });
  });

  it("uses a visible Bugdom native model for the hover beacon", () => {
    const context = createScriptWorkspaceContext(BugdomGlobals, 1);
    const state = loadScriptSample(context, "hover-beacon");

    expect(state.customObjects[0]?.visual).toEqual({
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject: 2,
      scale: 1,
      slot: 450,
    });
  });

  it("uses a visible Nanosaur native model for the hover beacon", () => {
    const context = createScriptWorkspaceContext(NanosaurGlobals, 1);
    const state = loadScriptSample(context, "hover-beacon");

    expect(state.customObjects[0]?.visual).toEqual({
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject: 15,
      scale: 1,
      slot: 450,
    });
  });

  it.each([
    [Bugdom2Globals, 13],
    [Nanosaur2Globals, 10],
    [CroMagGlobals, 0],
    [BillyFrontierGlobals, 10],
    [MightyMikeGlobals, 4],
  ])("uses a visible native hover beacon for another 3D game", (globals, modelObject) => {
    const context = createScriptWorkspaceContext(globals, 1);
    const state = loadScriptSample(context, "hover-beacon");

    expect(state.customObjects[0]?.visual).toEqual({
      kind: "nativeDisplayGroup",
      group: "global",
      modelObject,
      scale: 1,
      slot: 450,
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
    expect(bundle).not.toContain('__hasTag(ctx.tags, "bugdom.player")');
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

    const placementsResult = PlacementsFileSchema.safeParse(decodeJson(placementsFile.bytes));
    expect(placementsResult.success).toBe(true);
    if (!placementsResult.success) {
      return;
    }
    const placementsJson = placementsResult.data;
    expect(placementsJson).toHaveProperty("schemaVersion", 1);
    expect(placementsJson).toHaveProperty("placements");
    const placements = placementsJson.placements;
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

  it.each([
    {
      name: "Otto Matic",
      globals: OttoGlobals,
      sample: "otto-humans-jump",
      level: 3,
      sourcePath: "Data/Scripts/src/globals/otto-humans-jump.lua",
      tag: "ottomatic.human",
      formula: "ctx.levelTimeSeconds * 8",
      amplitude: "return 56",
    },
    {
      name: "Bugdom",
      globals: BugdomGlobals,
      sample: "bugdom-bouncing-friends",
      level: 2,
      sourcePath: "Data/Scripts/src/globals/bugdom-bouncing-friends.lua",
      tag: "bugdom.buddy",
      formula: "ctx.levelTimeSeconds * 6",
      amplitude: "* 20",
    },
    {
      name: "Bugdom 2",
      globals: Bugdom2Globals,
      sample: "bugdom2-clover-bob",
      level: 2,
      sourcePath: "Data/Scripts/src/globals/bugdom2-clover-bob.lua",
      tag: "bugdom2.collectible",
      formula: "ctx.levelTimeSeconds * 5",
      amplitude: "* 15",
    },
    {
      name: "Cro-Mag Rally",
      globals: CroMagGlobals,
      sample: "cromag-bouncing-pickups",
      level: 1,
      sourcePath: "Data/Scripts/src/globals/cromag-bouncing-pickups.lua",
      tag: "cromag.pickup",
      formula: "ctx.levelTimeSeconds * 7",
      amplitude: "* 25",
    },
    {
      name: "Nanosaur",
      globals: NanosaurGlobals,
      sample: "nanosaur-hover-eggs",
      level: 1,
      sourcePath: "Data/Scripts/src/globals/nanosaur-hover-eggs.lua",
      tag: "nanosaur.egg",
      formula: "ctx.levelTimeSeconds * 4",
      amplitude: "* 12",
    },
    {
      name: "Nanosaur 2",
      globals: Nanosaur2Globals,
      sample: "nanosaur2-powerup-spin",
      level: 3,
      sourcePath: "Data/Scripts/src/globals/nanosaur2-powerup-spin.lua",
      tag: "nanosaur2.powerup",
      formula: "ctx.levelTimeSeconds * 6",
      amplitude: "* 18",
    },
    {
      name: "Billy Frontier",
      globals: BillyFrontierGlobals,
      sample: "billy-cacti-bounce",
      level: 1,
      sourcePath: "Data/Scripts/src/globals/billy-cacti-bounce.lua",
      tag: "billy.cacti",
      formula: "ctx.levelTimeSeconds * 5",
      amplitude: "* 14",
    },
    {
      name: "Mighty Mike",
      globals: MightyMikeGlobals,
      sample: "mightymike-box-bob",
      level: 1,
      sourcePath: "Data/Scripts/src/globals/mightymike-box-bob.lua",
      tag: "mightymike.box",
      formula: "ctx.levelTimeSeconds * 5",
      amplitude: "* 16",
    },
  ])(
    "compiles and validates the $name Lua sample",
    ({ globals, sample, level, sourcePath, tag, formula, amplitude }) => {
      const context = createScriptWorkspaceContext(globals, level);
      const state = loadScriptSample(context, sample);

      const source = state.sourceFiles[sourcePath]?.content;
      expect(source).toBeDefined();
      expect(source).toContain(tag);
      expect(source).toContain(formula);
      expect(source).toContain(amplitude);

      const compileResult = compileScriptWorkspace(state);
      expect(compileResult.isOk()).toBe(true);
      if (compileResult.isErr()) {
        return;
      }

      const diagnostics = compileResult.value.diagnostics;
      const errors = diagnostics.filter((d) => d.severity === "error");
      expect(errors).toHaveLength(0);

      const packageFilesResult = buildScriptPackageFiles(compileResult.value);
      expect(packageFilesResult.isOk()).toBe(true);
      if (packageFilesResult.isErr()) {
        return;
      }

      expect(
        packageFilesResult.value.some((file) => file.path === sourcePath),
      ).toBe(true);

      const filesMap: Record<string, Uint8Array> = {};
      for (const file of packageFilesResult.value) {
        filesMap[file.path] = file.bytes;
      }

      const validationResult = validateScriptPackage(filesMap, context);
      expect(validationResult.isOk()).toBe(true);
    },
  );

  it("rejects replacements that reference missing objects", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 3);
    const state = loadScriptSample(context, "otto-humans-jump");
    const compileResult = compileScriptWorkspace(state);
    expect(compileResult.isOk()).toBe(true);
    if (compileResult.isErr()) return;

    const packageFilesResult = buildScriptPackageFiles(compileResult.value);
    expect(packageFilesResult.isOk()).toBe(true);
    if (packageFilesResult.isErr()) return;

    const filesMap: Record<string, Uint8Array> = {};
    for (const file of packageFilesResult.value) filesMap[file.path] = file.bytes;
    const projectBytes = filesMap["Data/Scripts/config/project.json"];
    expect(projectBytes).toBeDefined();
    if (!projectBytes) return;

    const projectResult = scriptProjectSchema.safeParse(decodeJson(projectBytes));
    expect(projectResult.success).toBe(true);
    if (!projectResult.success) return;
    const firstLevel = Object.entries(projectResult.data.editor.levels)[0];
    expect(firstLevel).toBeDefined();
    if (!firstLevel) return;
    const [levelKey, levelState] = firstLevel;
    const invalidProject = {
      ...projectResult.data,
      editor: {
        ...projectResult.data.editor,
        levels: {
          ...projectResult.data.editor.levels,
          [levelKey]: {
            ...levelState,
            terrainReplacements: [
              ...levelState.terrainReplacements,
              {
                id: "invalid.terrain",
                itemIndex: 1,
                nativeType: 1,
                x: 0,
                z: 0,
                customObjectId: "missing.object",
                strict: false,
              },
            ],
          },
        },
      },
    };
    filesMap["Data/Scripts/config/project.json"] = strToU8(JSON.stringify(invalidProject));

    const validationResult = validateScriptPackage(filesMap, context);
    expect(validationResult.isErr()).toBe(true);
    if (validationResult.isOk()) return;
    expect(validationResult.error).toContain("missing.object");
  });

  it("serializes Mighty Mike map replacements as map-scoped records", () => {
    const context = createScriptWorkspaceContext(MightyMikeGlobals, 1);
    const state = loadScriptSample(context, "mightymike-box-bob");
    const withObject = createCustomObjectFromBehavior(
      state,
      "sample.hover-beacon",
      "custom.map-box",
      "Map Box",
    );
    const customObject = withObject.customObjects[0];
    expect(customObject).toBeDefined();
    if (!customObject) return;

    const replaced = replaceMapItemWithCustomObject(withObject, {
      id: "map-4",
      itemIndex: 4,
      nativeType: 9,
      x: 12,
      y: 24,
      customObjectId: customObject.id,
      strict: false,
    });
    const compileResult = compileScriptWorkspace(replaced);
    expect(compileResult.isOk()).toBe(true);
    if (compileResult.isErr()) return;
    const packageResult = buildScriptPackageFiles(compileResult.value);
    expect(packageResult.isOk()).toBe(true);
    if (packageResult.isErr()) return;

    const filesMap: Record<string, Uint8Array> = {};
    for (const file of packageResult.value) filesMap[file.path] = file.bytes;
    expect(validateScriptPackage(filesMap, context).isOk()).toBe(true);

    const levelsFile = packageResult.value.find(
      (file) => file.path === "Data/Scripts/config/levels.json",
    );
    expect(levelsFile).toBeDefined();
    if (!levelsFile) return;
    const levels = decodeJson(levelsFile.bytes);
    expect(levels).toMatchObject({
      levels: {
        "1": {
          mapReplacements: [
            expect.objectContaining({
              itemIndex: 4,
              nativeType: 9,
              x: 12,
              y: 24,
              customObjectId: customObject.id,
            }),
          ],
        },
      },
    });
  });
});
