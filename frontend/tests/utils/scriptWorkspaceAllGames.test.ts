import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
  type GlobalsInterface,
} from "@/data/globals/globals";
import {
  buildPreviewScriptFilesAsync,
  buildScriptPackageZipAsync,
  createScriptWorkspaceContext,
  importScriptPackageZipAsync,
  loadScriptSample,
} from "@/editor/subviews/scripts/scriptWorkspaceState";

interface ScriptGameFixture {
  readonly gameId: string;
  readonly globals: GlobalsInterface;
  readonly assetPath: string;
  readonly fixturePath: string;
  readonly fixtureSourceName: string;
}

const scriptGameFixtures: readonly ScriptGameFixture[] = [
  {
    gameId: "OttoMatic-Android",
    globals: OttoGlobals,
    assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    fixturePath: "../../public/games/ottomatic/skeletons/GiantLizard.bg3d",
    fixtureSourceName: "GiantLizard.bg3d",
  },
  {
    gameId: "Bugdom-android",
    globals: BugdomGlobals,
    assetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    fixturePath: "../../public/games/bugdom1/skeletons/FireFly.skeleton.rsrc",
    fixtureSourceName: "FireFly.skeleton.rsrc",
  },
  {
    gameId: "Bugdom2-Android",
    globals: Bugdom2Globals,
    assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    fixturePath: "../../public/games/bugdom2/skeletons/Mouse.bg3d",
    fixtureSourceName: "Mouse.bg3d",
  },
  {
    gameId: "Nanosaur-android",
    globals: NanosaurGlobals,
    assetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    fixturePath: "../../public/games/nanosaur1/skeletons/Rex.skeleton.rsrc",
    fixtureSourceName: "Rex.skeleton.rsrc",
  },
  {
    gameId: "Nanosaur2-Android",
    globals: Nanosaur2Globals,
    assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    fixturePath: "../../public/games/nanosaur2/skeletons/bonusworm.bg3d",
    fixtureSourceName: "bonusworm.bg3d",
  },
  {
    gameId: "CroMagRally-Android",
    globals: CroMagGlobals,
    assetPath: "Data/Scripts/assets/models/production-fixture.bg3d",
    fixturePath: "../../public/games/cromagrally/skeletons/GragStanding.bg3d",
    fixtureSourceName: "GragStanding.bg3d",
  },
  {
    gameId: "BillyFrontier-Android",
    globals: BillyFrontierGlobals,
    assetPath: "Data/Scripts/assets/skeletons/production-fixture.skeleton.rsrc",
    fixturePath: "../../public/games/billyfrontier/skeletons/Billy.skeleton.rsrc",
    fixtureSourceName: "Billy.skeleton.rsrc",
  },
  {
    gameId: "MightyMike-Android",
    globals: MightyMikeGlobals,
    assetPath: "Data/Scripts/assets/shapes/production-fixture.shapes",
    fixturePath: "../../public/data/mightymike/shapes/main.shapes",
    fixtureSourceName: "main.shapes",
  },
];

function readFixture(relativePath: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, relativePath)));
}

describe("script workspace production package path", () => {
  it.each(scriptGameFixtures)(
    "round-trips the Lua package for $gameId",
    async ({ gameId, globals }) => {
      const context = createScriptWorkspaceContext(globals, 1);
      const state = loadScriptSample(context, "log-level-start");

      const packageResult = await buildScriptPackageZipAsync(state);
      expect(packageResult.isOk()).toBe(true);
      if (packageResult.isErr()) return;

      const importedResult = await importScriptPackageZipAsync(
        packageResult.value,
        context,
      );
      expect(importedResult.isOk()).toBe(true);
      if (importedResult.isErr()) return;

      expect(importedResult.value.context.gameId).toBe(gameId);
      expect(importedResult.value.compiledFiles["Data/Scripts/dist/main.lua"])
        .toBeDefined();
      expect(importedResult.value.sourceFiles["Data/Scripts/src/main.lua"])
        .toBeDefined();
    },
  );

  it.each(scriptGameFixtures)(
    "round-trips a production asset through the package path for $gameId",
    async ({ gameId, globals, assetPath, fixturePath, fixtureSourceName }) => {
      const context = createScriptWorkspaceContext(globals, 1);
      const state = loadScriptSample(context, "log-level-start");
      const fixtureBytes = readFixture(fixturePath);
      const stateWithAsset = {
        ...state,
        assets: {
          ...state.assets,
          [assetPath]: {
            path: assetPath,
            bytes: fixtureBytes,
            sourceName: fixtureSourceName,
          },
        },
      };

      const packageResult = await buildScriptPackageZipAsync(stateWithAsset);
      expect(packageResult.isOk(), `${gameId} asset package should build`).toBe(true);
      if (packageResult.isErr()) return;

      const previewResult = await buildPreviewScriptFilesAsync(stateWithAsset);
      expect(previewResult.isOk(), `${gameId} asset preview should build`).toBe(true);
      if (previewResult.isErr()) return;
      expect(
        previewResult.value.find((file) => file.path === `/${assetPath}`)?.data,
      ).toEqual(fixtureBytes);

      const importedResult = await importScriptPackageZipAsync(
        packageResult.value,
        context,
      );
      expect(importedResult.isOk(), `${gameId} asset package should import`).toBe(true);
      if (importedResult.isErr()) return;

      const importedAsset = importedResult.value.assets[assetPath];
      expect(importedAsset).toBeDefined();
      if (!importedAsset) return;
      expect(importedAsset.bytes).toEqual(fixtureBytes);
    },
  );
});
