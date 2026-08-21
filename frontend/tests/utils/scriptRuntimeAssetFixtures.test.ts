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

describe("production scripting asset fixtures", () => {
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
      const customAssetBytes = readPublicFixture(fixture.customAssetSourcePath);

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
          { path: fixture.customAssetPath, data: customAssetBytes },
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
      expect(vfs.files.get(fixture.customAssetPath)).toEqual(customAssetBytes);
      expect(vfs.files.get("Data/Scripts/dist/main.lua")).toEqual(
        new Uint8Array([0x72, 0x65, 0x74, 0x75, 0x72, 0x6e]),
      );
    },
  );
});
