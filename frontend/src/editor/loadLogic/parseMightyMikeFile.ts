import { LevelData } from "../../python/structSpecs/LevelTypes";
import { Result, ok, err, fromPromise } from "../../types/result";
import {
  parseMightyMikeMap,
  parseMightyMikeTileSet,
  mightyMikeMapToCompressedBinary,
} from "../../modelParsers/parseMightyMike";
import type {
  MightyMikeTileSet,
  MightyMikeTileValue,
} from "../../python/structSpecs/mightyMikeInterface";
import {
  splitLevelData,
  AtomicLevelData,
  isLevelDataLike,
} from "../../data/utils/levelDataUtils";
import { extractTGAPalette } from "../../utils/tgaParser";

import { isRecord, isMightyMikeMap } from "./typeGuards";

// Type guard for MightyMikeTileSet
function isMightyMikeTileSet(value: unknown): value is MightyMikeTileSet {
  if (!isRecord(value)) return false;
  const rec = value; // narrowed by isRecord(value)
  // Required numeric fields
  if (typeof rec.numTileDefinitions !== "number") return false;
  if (typeof rec.numXlateEntries !== "number") return false;
  if (typeof rec.numTileAttributeEntries !== "number") return false;
  if (typeof rec.numTileAnims !== "number") return false;
  if (typeof rec.numTileXparentColors !== "number") return false;

  // Required arrays
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

  // Optional tileImages: if present, should be array-like and look like canvases
  if ("tileImages" in rec && rec.tileImages !== undefined) {
    if (!Array.isArray(rec.tileImages)) return false;
    if (
      !rec.tileImages.every((t) => {
        if (!isRecord(t)) return false;
        const r = t; // narrowed by isRecord
        return typeof r["getContext"] === "function";
      })
    )
      return false;
  }

  return true;
}

/**
 * Get the scene name from the map file URL
 * Example: "jurassic.map-1" -> "jurassic"
 */
function getSceneNameFromUrl(mapFileUrl: string): string | null {
  const filename = mapFileUrl.split("/").pop();
  if (!filename) return null;
  const match = filename.match(/^(\w+)\.map-\d+$/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Load the palette from the scene-specific TGA file
 */
async function loadScenePalette(
  sceneName: string,
  basePath?: string,
): Promise<Uint8Array | null> {
  // Map scene names to TGA filenames
  const sceneToTGA: Record<string, string> = {
    jurassic: "dinoscene.tga",
    candy: "candyscene.tga",
    fairy: "fairyscene.tga",
    clown: "clownscene.tga",
    bargain: "bargainscene.tga",
  };

  const tgaFilename = sceneToTGA[sceneName.toLowerCase()];
  if (!tgaFilename) {
    return null;
  }

  let tgaUrl: string;
  if (basePath && basePath.includes("/")) {
    const dirPath = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    tgaUrl = dirPath + tgaFilename;
  } else {
    tgaUrl = `${import.meta.env.BASE_URL}assets/mightyMike/terrain/${tgaFilename}`;
  }

  const fetchResult = await fromPromise(fetch(tgaUrl));
  if (fetchResult.isErr() || !fetchResult.value.ok) {
    return null;
  }

  const response = fetchResult.value;
  const bufferResult = await fromPromise(response.arrayBuffer());
  if (bufferResult.isErr()) {
    return null;
  }

  const tgaBuffer = bufferResult.value;
  const paletteResult = extractTGAPalette(tgaBuffer);

  if (!paletteResult) {
    return null;
  }

  return new Uint8Array(paletteResult.colors);
}

/**
 * Parse a MightyMike .map file and optionally load the corresponding .tileset file
 */
export async function parseMightyMikeFile(
  file: Blob,
  setData: (data: AtomicLevelData) => void,
  mapFileUrl?: string,
  setMapImages?: (images: HTMLCanvasElement[]) => void,
): Promise<Result<LevelData, Error>> {
  const bufferResult = await fromPromise(file.arrayBuffer());
  if (bufferResult.isErr()) {
    return err(
      new Error(`Failed to read file buffer: ${bufferResult.error.message}`),
    );
  }

  const levelBuffer = bufferResult.value;
  const mapResult = parseMightyMikeMap(levelBuffer);
  if (mapResult.isErr()) {
    return err(new Error(`Failed to parse MightyMike map: ${mapResult.error}`));
  }

  let tilesetData = null;
  let paletteData: Uint8Array | null = null;

  if (mapFileUrl) {
    const sceneName = getSceneNameFromUrl(mapFileUrl);
    if (sceneName) {
      paletteData = await loadScenePalette(sceneName, mapFileUrl);
    }

    const tilesetUrl = mapFileUrl.replace(/\.map-\d+$/, ".tileset");
    const tilesetFetchResult = await fromPromise(fetch(tilesetUrl));
    if (tilesetFetchResult.isOk() && tilesetFetchResult.value.ok) {
      const tilesetBufferResult = await fromPromise(
        tilesetFetchResult.value.arrayBuffer(),
      );
      if (tilesetBufferResult.isOk()) {
        const tilesetBuffer = tilesetBufferResult.value;
        const tilesetResult = parseMightyMikeTileSet(
          tilesetBuffer,
          paletteData || undefined,
        );

        if (tilesetResult.isOk()) {
          tilesetData = tilesetResult.value;
        }
      }
    }
  }

  const ottoCompatible = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: mapResult.value.numItems,
          mapWidth: mapResult.value.mapWidth,
          mapHeight: mapResult.value.mapHeight,
          tileSize: 32,
          minY: 0,
          maxY: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: tilesetData?.numTileDefinitions || 100,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: mapResult.value.mapImage
          .flat()
          .map((tileValue) => tileValue.tileIndex),
        order: 1,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        obj: new Array(mapResult.value.numItems).fill(0),
        order: 3,
      },
    },
    YCrd: {
      1000: {
        name: "Y Coordinates",
        obj: new Array(
          mapResult.value.mapWidth * mapResult.value.mapHeight,
        ).fill(0),
        order: 4,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      1000: {
        name: "Metadata",
        obj: {
          mightyMikeTileValues: mapResult.value.mapImage.flat(),
        },
        order: 5,
      },
    },
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: mapResult.value.items.map((item) => ({
          x: item.x,
          z: item.y,
          type: item.type,
          p0: item.p0,
          p1: item.p1,
          p2: item.p2,
          p3: item.p3,
          flags: 0,
        })),
        order: 2,
      },
    },
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: new Array(tilesetData?.numTileDefinitions || 100).fill({
          flags: 0,
          p0: 0,
          p1: 0,
        }),
        order: 6,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 10,
      },
    },
    Vcol: {},
    ...(tilesetData && { tileset: tilesetData }),
    ...(tilesetData?.xlateTable && {
      Xlat: {
        1000: {
          name: "Tile Translation Table",
          obj: tilesetData.xlateTable.map((idx) => ({ idx })),
        },
      },
    }),
  };

  const tilesetRaw =
    isRecord(ottoCompatible) && "tileset" in ottoCompatible
      ? ottoCompatible["tileset"]
      : undefined;
  const tilesetField = isMightyMikeTileSet(tilesetRaw) ? tilesetRaw : undefined;

  if (!isLevelDataLike(ottoCompatible)) {
    return err(new Error("Constructed data is not valid LevelData"));
  }
  const atomicData = splitLevelData(ottoCompatible);
  setData(atomicData);

  if (
    tilesetField?.tileImages &&
    Array.isArray(tilesetField.tileImages) &&
    setMapImages
  ) {
    const canvases = tilesetField.tileImages.filter(
      (img): img is HTMLCanvasElement =>
        isRecord(img) && typeof img["getContext"] === "function",
    );
    if (canvases.length > 0) setMapImages(canvases);
  }

  const finalData: Record<string, unknown> = {
    ...ottoCompatible,
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      1000: {
        name: "Metadata",
        obj: {
          mightyMikeMapData: mapResult.value,
          mightyMikeTileValues: mapResult.value.mapImage.flat(),
        },
        order: 100,
      },
    },
  };

  if (!isLevelDataLike(finalData)) {
    return err(new Error("Final data is not LevelData"));
  }

  return ok(finalData);
}

/**
 * Serialize a Mighty Mike level back to binary .map format
 */
export function serializeMightyMikeLevel(
  levelData: LevelData,
): Result<ArrayBuffer, Error> {
  const metadataRaw = levelData._metadata?.[1000];
  if (!isRecord(metadataRaw) || !isRecord(metadataRaw.obj)) {
    return err(
      new Error(
        "Missing Mighty Mike metadata structure (1000.obj) for serialization",
      ),
    );
  }

  const metadata = metadataRaw.obj;
  if (!isMightyMikeMap(metadata.mightyMikeMapData)) {
    return err(
      new Error("Missing or invalid Mighty Mike map data for serialization"),
    );
  }
  if (!Array.isArray(metadata.mightyMikeTileValues)) {
    return err(
      new Error("Missing or invalid Mighty Mike tile values for serialization"),
    );
  }

  const mapData = metadata.mightyMikeMapData;
  const rawTileValues = metadata.mightyMikeTileValues;

  // Normalize tile values preserving indices so serialization is index-consistent
  const tileValues: MightyMikeTileValue[] = rawTileValues.map((t: unknown) => {
    if (!isRecord(t)) {
      return {
        rawValue: 0,
        tileIndex: 0,
        hasCollisionMask: false,
        usePixelAccurateCollision: false,
      };
    }
    return {
      rawValue: typeof t.rawValue === "number" ? t.rawValue : 0,
      tileIndex: typeof t.tileIndex === "number" ? t.tileIndex : 0,
      hasCollisionMask: !!t.hasCollisionMask,
      usePixelAccurateCollision: !!t.usePixelAccurateCollision,
    };
  });

  const items = levelData.Itms?.[1000]?.obj || [];
  mapData.items = items.map((item: unknown) => {
    if (!isRecord(item))
      return { x: 0, y: 0, type: 0, p0: 0, p1: 0, p2: 0, p3: 0 };
    return {
      x: typeof item.x === "number" ? item.x : 0,
      y: typeof item.z === "number" ? item.z : 0,
      type: typeof item.type === "number" ? item.type : 0,
      p0: typeof item.p0 === "number" ? item.p0 : 0,
      p1: typeof item.p1 === "number" ? item.p1 : 0,
      p2: typeof item.p2 === "number" ? item.p2 : 0,
      p3: typeof item.p3 === "number" ? item.p3 : 0,
    };
  });
  mapData.numItems = mapData.items.length;

  const layrRaw = levelData.Layr?.[1000]?.obj;
  const layr = Array.isArray(layrRaw) ? layrRaw : [];
  const TILENUM_MASK = 0x07ff;

  if (Array.isArray(layr)) {
    layr.forEach((newTileIndex: unknown, i: number) => {
      const newIndex = typeof newTileIndex === "number" ? newTileIndex : 0;
      if (i < tileValues.length) {
        const tile = tileValues[i];
        if (tile) {
          tile.tileIndex = newIndex;
          const rawValue =
            typeof tile.rawValue === "number" ? tile.rawValue : 0;
          tile.rawValue =
            (rawValue & ~TILENUM_MASK) | (newIndex & TILENUM_MASK);
        }
      }
    });
  }

  const mapImage: MightyMikeTileValue[][] = [];
  const width = mapData.mapWidth;
  const height = mapData.mapHeight;

  for (let y = 0; y < height; y++) {
    const row: MightyMikeTileValue[] = [];
    for (let x = 0; x < width; x++) {
      const tile = tileValues[y * width + x];
      if (
        tile &&
        typeof tile.rawValue === "number" &&
        typeof tile.tileIndex === "number"
      ) {
        row.push({
          rawValue: tile.rawValue,
          tileIndex: tile.tileIndex,
          hasCollisionMask: !!tile.hasCollisionMask,
          usePixelAccurateCollision: !!tile.usePixelAccurateCollision,
        });
      } else {
        row.push({
          rawValue: 0,
          tileIndex: 0,
          hasCollisionMask: false,
          usePixelAccurateCollision: false,
        });
      }
    }
    mapImage.push(row);
  }
  mapData.mapImage = mapImage;

  return ok(mightyMikeMapToCompressedBinary(mapData));
}
