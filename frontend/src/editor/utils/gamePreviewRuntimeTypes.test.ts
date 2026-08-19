import { describe, expect, test, vi } from "vitest";
import { Game } from "@/data/globals/globals";
import { GAME_PORT_CONFIGS } from "./gamePortConfig";
import { getPreviewTerrainPaths } from "./gamePreviewRuntimeTypes";
import { writeTerrainToVfs } from "./gamePreviewRuntimeVfs";

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
});
