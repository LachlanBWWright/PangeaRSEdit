import { MIGHTY_MIKE_SCENES } from "@/data/game/gameAtoms";
import { mapErr } from "@/utils/mapErr";
import type { MightyMikeTileSet } from "../../python/structSpecs/mightyMikeInterface";
import { extractTGAPaletteRaw } from "../../utils/tgaParser";
import { ResultAsync } from "neverthrow";
import { isRecord } from "./typeGuards";

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
  if (!isRecord(value)) return false;
  const rec = value;

  if (typeof rec.numTileDefinitions !== "number") return false;
  if (typeof rec.numXlateEntries !== "number") return false;
  if (typeof rec.numTileAttributeEntries !== "number") return false;
  if (typeof rec.numTileAnims !== "number") return false;
  if (typeof rec.numTileXparentColors !== "number") return false;

  if (
    !Array.isArray(rec.xlateTable) ||
    !rec.xlateTable.every((n) => typeof n === "number")
  )
    return false;
  if (!Array.isArray(rec.tileAttributes)) return false;
  if (!Array.isArray(rec.tileAnimations)) return false;
  if (
    !Array.isArray(rec.transparencyColors) ||
    !rec.transparencyColors.every((n) => typeof n === "number")
  )
    return false;

  if (!("tileImages" in rec) || rec.tileImages === undefined) return true;
  if (!Array.isArray(rec.tileImages)) return false;
  return rec.tileImages.every(
    (t) => isRecord(t) && typeof t["getContext"] === "function",
  );
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
