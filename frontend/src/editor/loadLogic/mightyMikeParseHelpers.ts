import { MIGHTY_MIKE_SCENES } from "@/data/game/gameAtoms";
import { mapErr } from "@/utils/mapErr";
import { mightyMikeTileSetSchema } from "@/schemas/common";
import { extractTGAPaletteRaw } from "../../utils/tgaParser";
import { ResultAsync } from "neverthrow";
import type { MightyMikeTileSet } from "@/schemas/common";

export function getMightyMikeSceneFromPath(
  mapFileUrl?: string,
): string | undefined {
  return MIGHTY_MIKE_SCENES.find(
    (scene) =>
      mapFileUrl?.endsWith(`/${scene}.map-1`) ||
      mapFileUrl?.endsWith(`/${scene}.map-2`) ||
      mapFileUrl?.endsWith(`/${scene}.map-3`),
  );
}

export function isMightyMikeTileSet(
  value: unknown,
): value is MightyMikeTileSet {
  return mightyMikeTileSetSchema.safeParse(value).success;
}

export async function loadBorderPalette(
  basePath?: string,
): Promise<Uint8Array | null> {
  const tgaFilename = "border.tga";
  const tgaUrl =
    basePath && basePath.includes("/")
      ? `${basePath.substring(0, basePath.lastIndexOf("/") + 1)}${tgaFilename}`
      : `${import.meta.env.BASE_URL}assets/mightyMike/terrain/${tgaFilename}`;

  const fetchResult = await ResultAsync.fromPromise(fetch(tgaUrl), mapErr);
  if (fetchResult.isErr()) return null;
  if (!fetchResult.value.ok) return null;

  const bufferResult = await ResultAsync.fromPromise(
    fetchResult.value.arrayBuffer(),
    mapErr,
  );
  if (bufferResult.isErr()) return null;

  const paletteResult = extractTGAPaletteRaw(bufferResult.value);
  if (!paletteResult) return null;
  return new Uint8Array(paletteResult.colors);
}
