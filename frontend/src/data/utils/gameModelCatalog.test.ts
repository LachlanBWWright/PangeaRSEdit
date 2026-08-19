import { existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { GAMES } from "../games";

const PUBLIC_GAMES_ROOT = join(__dirname, "../../../public/games");
const PUBLIC_URL_PREFIX = "/PangeaRSEdit/games/";
const MODEL_EXTENSIONS = [".bg3d", ".3dmf"];

function normalizeModelName(value: string): string {
  return value
    .replace(/\.(?:bg3d|3dmf)$/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function toPublicPath(assetUrl: string): string {
  return join(PUBLIC_GAMES_ROOT, assetUrl.replace(PUBLIC_URL_PREFIX, ""));
}

function readModelFiles(gameId: string, directory: string) {
  const assetDirectory = join(PUBLIC_GAMES_ROOT, gameId, directory);
  return Result.fromThrowable(
    () =>
      readdirSync(assetDirectory)
        .filter((fileName) =>
          MODEL_EXTENSIONS.some((extension) => fileName.endsWith(extension)),
        )
        .map((fileName) => `${gameId}/${directory}/${fileName}`),
    (cause) => String(cause),
  )();
}

describe("game model catalogs", () => {
  it.each(GAMES)("includes every packaged model for $name", (game) => {
    const modelFilesResult = readModelFiles(game.id, "models");
    const skeletonFilesResult = readModelFiles(game.id, "skeletons");

    expect(modelFilesResult.isOk()).toBe(true);
    expect(skeletonFilesResult.isOk()).toBe(true);
    if (modelFilesResult.isErr() || skeletonFilesResult.isErr()) return;

    const catalogFiles = game.models.map((model) =>
      model.bg3dFile.replace(PUBLIC_URL_PREFIX, ""),
    );
    const packagedFiles = [
      ...modelFilesResult.value,
      ...skeletonFilesResult.value,
    ];

    expect(catalogFiles.sort()).toEqual(packagedFiles.sort());
  });

  it.each(GAMES)("uses valid files and matching names for $name", (game) => {
    for (const model of game.models) {
      expect(existsSync(toPublicPath(model.bg3dFile))).toBe(true);
      expect(normalizeModelName(model.name)).toBe(
        normalizeModelName(basename(model.bg3dFile)),
      );

      if (model.skeletonFile !== undefined) {
        expect(existsSync(toPublicPath(model.skeletonFile))).toBe(true);
      }
    }
  });
});
