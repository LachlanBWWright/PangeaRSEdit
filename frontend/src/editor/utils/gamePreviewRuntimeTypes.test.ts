import { describe, expect, test, vi } from "vitest";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import {
  getPreviewTerrainPaths,
  resolvePreviewRuntimeAssetPath,
  buildPreviewAssetBaseUrls,
} from "./gamePreviewRuntimeTypes";
import { createPreviewModule } from "./gamePreviewRuntimeLoader";
import {
  writePreviewCustomFilesToVfs,
  writeTerrainToVfs,
} from "./gamePreviewRuntimeVfs";

describe("preview runtime asset directories", () => {
  test.each([
    { game: Game.OTTO_MATIC, directory: "ottomatic/", script: "OttoMatic.js" },
    { game: Game.NANOSAUR, directory: "nanosaur/", script: "Nanosaur.js" },
    { game: Game.BUGDOM, directory: "bugdom/", script: "Bugdom.js" },
    { game: Game.BUGDOM_2, directory: "bugdom2/", script: "Bugdom2.js" },
    { game: Game.CRO_MAG, directory: "cromagrally/", script: "CroMagRally.js" },
    { game: Game.BILLY_FRONTIER, directory: "billyfrontier/", script: "billyfrontier.js" },
    { game: Game.MIGHTY_MIKE, directory: "mightymike/", script: "MightyMike.js" },
    { game: Game.NANOSAUR_2, directory: "nanosaur2/", script: "Nanosaur2.js" },
  ])("resolves $script alongside its generated launch page", ({ game, directory, script }) => {
    const config = GAME_PORT_CONFIGS[game];
    const bases = buildPreviewAssetBaseUrls(config);
    expect(bases).toHaveLength(1);
    const base = bases[0];
    expect(base).toBeDefined();
    if (!base) return;
    const expected = `${import.meta.env.BASE_URL}generated/pangea-ports/wasm/${directory}`;
    expect(new URL(config.mainJs, base).pathname).toBe(`${expected}${script}`);
    expect(new URL("game.wasm", base).pathname).toBe(`${expected}game.wasm`);
    expect(new URL("game.data", base).pathname).toBe(`${expected}game.data`);
  });
});

describe("Mighty Mike preview terrain paths", () => {
  test("injects the edited tileset at the lowercase path used by the game", () => {
    const config = GAME_PORT_CONFIGS[Game.MIGHTY_MIKE];
    const info = config.levels[0];
    expect(info).toBeDefined();
    if (!info) return;

    const paths = getPreviewTerrainPaths(info, config);

    expect(paths?.texturePath).toBe("/Data/Maps/Jurassic.tileset");
    expect(paths?.altTexturePath).toBe("/Data/Maps/jurassic.tileset");
  });

  test("writes edited tileset bytes to both case variants", () => {
    const config = GAME_PORT_CONFIGS[Game.MIGHTY_MIKE];
    const info = config.levels[0];
    expect(info).toBeDefined();
    if (!info) return;
    const paths = getPreviewTerrainPaths(info, config);
    expect(paths).not.toBeNull();
    if (!paths) return;
    const writeFile = vi.fn();
    const onError = vi.fn();

    writeTerrainToVfs(
      {
        canvas: document.createElement("canvas"),
        arguments: [],
        preRun: [],
        locateFile: (path) => path,
        FS: { writeFile },
      },
      config,
      info,
      paths,
      null,
      null,
      new Uint8Array([1, 2, 3]),
      undefined,
      onError,
    );

    expect(writeFile).toHaveBeenCalledWith(
      "/Data/Maps/Jurassic.tileset",
      new Uint8Array([1, 2, 3]),
    );
    expect(writeFile).toHaveBeenCalledWith(
      "/Data/Maps/jurassic.tileset",
      new Uint8Array([1, 2, 3]),
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test("writes scripting files without terrain metadata", () => {
    const writeFile = vi.fn();
    const onError = vi.fn();
    const scriptBytes = new Uint8Array([1, 2, 3]);

    writePreviewCustomFilesToVfs(
      {
        canvas: document.createElement("canvas"),
        arguments: [],
        preRun: [],
        locateFile: (path) => path,
        FS: { writeFile },
      },
      [{ path: "Data/Scripts/dist/main.lua", data: scriptBytes }],
      onError,
    );

    expect(writeFile).toHaveBeenCalledWith(
      "Data/Scripts/dist/main.lua",
      scriptBytes,
    );
    expect(onError).not.toHaveBeenCalled();
  });

  test("injects scripting files during a main-menu launch", () => {
    const writeFile = vi.fn();
    const onError = vi.fn();
    const module = createPreviewModule({
      config: GAME_PORT_CONFIGS[Game.BUGDOM],
      levelNumber: 0,
      currentLevelInfo: undefined,
      canvas: document.createElement("canvas"),
      assetBaseUrl: "https://example.com/",
      cacheBustToken: "test-token",
      terrainDataBytes: null,
      terrainRsrcBytes: null,
      terrainTextureBytes: null,
      terrainPaths: null,
      customFiles: [{
        path: "Data/Scripts/dist/main.lua",
        data: new Uint8Array([4, 5, 6]),
      }],
      normalLaunch: true,
      onStatus: () => undefined,
      onError,
    });
    module.FS = { writeFile };

    expect(module.locateFile("datafile_Bugdom.data")).toBe(
      "https://example.com/Bugdom.data?v=test-token",
    );

    module.onRuntimeInitialized?.();

    expect(writeFile).toHaveBeenCalledWith(
      "Data/Scripts/dist/main.lua",
      new Uint8Array([4, 5, 6]),
    );
  });
});

describe("resolvePreviewRuntimeAssetPath", () => {
  test("maps Emscripten datafile names to staged bundle names", () => {
    expect(resolvePreviewRuntimeAssetPath("datafile_Nanosaur2.data")).toBe(
      "Nanosaur2.data",
    );
    expect(
      resolvePreviewRuntimeAssetPath("assets/datafile_CroMagRally.data"),
    ).toBe("assets/CroMagRally.data");
  });

  test("preserves other runtime asset names", () => {
    expect(resolvePreviewRuntimeAssetPath("Nanosaur2.wasm")).toBe(
      "Nanosaur2.wasm",
    );
  });
});
