import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";
import {
  getPreviewTerrainPaths,
  type PreviewRuntimeModule,
} from "@/editor/utils/gamePreviewRuntimeTypes";
import { writeTerrainToVfs } from "@/editor/utils/gamePreviewRuntimeVfs";
import { SCRIPT_RUNTIME_ASSET_FIXTURES } from "@/editor/utils/scriptRuntimeAssetFixtures";
import { SCRIPTING_CONTRACT } from "@/editor/subviews/scripts/scriptContract";

interface FixtureVfs {
  readonly files: Map<string, Uint8Array>;
  readonly directories: Set<string>;
  readonly module: PreviewRuntimeModule;
}

function createFixtureVfs(): FixtureVfs {
  const files = new Map<string, Uint8Array>();
  const directories = new Set<string>();
  const module: PreviewRuntimeModule = {
    canvas: document.createElement("canvas"),
    arguments: [],
    preRun: [],
    locateFile: (path) => path,
    FS: {
      writeFile: (path, data) => {
        files.set(path, data);
      },
      analyzePath: (path) => ({ exists: directories.has(path) }),
      mkdir: (path) => {
        directories.add(path);
      },
    },
  };
  return { files, directories, module };
}

function readPublicFixture(relativePath: string): Uint8Array {
  return new Uint8Array(
    readFileSync(resolve(import.meta.dirname, "../../public", relativePath)),
  );
}

function expectFixtureFile(
  files: ReadonlyMap<string, Uint8Array>,
  path: string | null,
  bytes: Uint8Array | null,
): void {
  if (!path || !bytes) return;
  expect(files.get(path)).toEqual(bytes);
}

const fixtureGameIds: Readonly<Record<number, string>> = {
  0: "OttoMatic-Android",
  1: "Bugdom-android",
  2: "Bugdom2-Android",
  3: "Nanosaur-android",
  4: "Nanosaur2-Android",
  5: "CroMagRally-Android",
  6: "BillyFrontier-Android",
  7: "MightyMike-Android",
};

function assetKind(path: string): string | null {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".bg3d")) return "bg3d";
  if (lowerPath.endsWith(".3dmf")) return "3dmf";
  if (lowerPath.endsWith(".shapes")) return "shapes";
  if (lowerPath.endsWith(".skeleton") || lowerPath.endsWith(".skeleton.rsrc")) return "skeleton";
  return null;
}

describe("production scripting asset fixtures", () => {
  it("covers every contract-declared custom asset kind for every game", () => {
    const fixtureIds = SCRIPT_RUNTIME_ASSET_FIXTURES.map(
      (fixture) => fixtureGameIds[fixture.game],
    );
    expect(new Set(fixtureIds)).toEqual(new Set(Object.keys(SCRIPTING_CONTRACT.games)));
    for (const fixture of SCRIPT_RUNTIME_ASSET_FIXTURES) {
      const gameId = fixtureGameIds[fixture.game];
      const contractGame = gameId === undefined
        ? undefined
        : SCRIPTING_CONTRACT.games[gameId];
      expect(contractGame, `missing contract game for fixture ${String(fixture.game)}`).toBeDefined();
      if (!contractGame) continue;
      const fixtureKinds = new Set(
        fixture.customAssets.flatMap((asset) => {
          const kind = assetKind(asset.path);
          return kind === null ? [] : [kind];
        }),
      );
      for (const kind of contractGame.assetKinds) {
        expect(fixtureKinds, `${gameId} is missing a ${kind} fixture`).toContain(kind);
      }
    }
  });

  it.each(SCRIPT_RUNTIME_ASSET_FIXTURES)(
    "injects the real $game terrain and custom asset bytes into the VFS",
    (fixture) => {
      const config = GAME_PORT_CONFIGS[fixture.game];
      const level = config.levels[config.defaultLevel];
      const terrainPaths = getPreviewTerrainPaths(level, config);
      const vfs = createFixtureVfs();
      const errors: string[] = [];
      const terrainDataBytes = fixture.terrainDataPath
        ? readPublicFixture(fixture.terrainDataPath)
        : null;
      const terrainRsrcBytes = fixture.terrainRsrcPath
        ? readPublicFixture(fixture.terrainRsrcPath)
        : null;
      const terrainTextureBytes = fixture.terrainTexturePath
        ? readPublicFixture(fixture.terrainTexturePath)
        : null;
      const customAssets = fixture.customAssets.map((asset) => ({
        path: asset.path,
        data: readPublicFixture(asset.sourcePath),
      }));

      expect(terrainPaths).not.toBeNull();
      if (!terrainPaths) return;

      writeTerrainToVfs(
        vfs.module,
        config,
        level,
        terrainPaths,
        terrainDataBytes,
        terrainRsrcBytes,
        terrainTextureBytes,
        [
          {
            path: "Data/Scripts/dist/main.lua",
            data: new Uint8Array([0x72, 0x65, 0x74, 0x75, 0x72, 0x6e]),
          },
          ...customAssets,
        ],
        (error) => errors.push(error),
      );

      expect(errors).toEqual([]);
      expectFixtureFile(vfs.files, terrainPaths.dataPath, terrainDataBytes);
      expectFixtureFile(vfs.files, terrainPaths.rsrcPath, terrainRsrcBytes);
      expectFixtureFile(
        vfs.files,
        terrainPaths.texturePath ?? null,
        terrainTextureBytes,
      );
      for (const asset of customAssets) {
        expect(vfs.files.get(asset.path)).toEqual(asset.data);
      }
      expect(vfs.files.get("Data/Scripts/dist/main.lua")).toEqual(
        new Uint8Array([0x72, 0x65, 0x74, 0x75, 0x72, 0x6e]),
      );
    },
  );
});
