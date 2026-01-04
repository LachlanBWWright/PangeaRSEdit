import { LevelData } from "../../python/structSpecs/LevelTypes";
import { Result, ok, err } from "../../types/result";
import {
  parseMightyMikeMap,
  parseMightyMikeTileSet,
  mightyMikeMapToCompressedBinary,
} from "../../modelParsers/parseMightyMike";
import type { MightyMikeTileSet, MightyMikeMap } from "../../python/structSpecs/mightyMikeInterface";
import { splitLevelData, AtomicLevelData } from "../../data/utils/levelDataUtils";
import { extractTGAPalette } from "../../utils/tgaParser";

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Type guard for MightyMikeTileSet
function isMightyMikeTileSet(value: unknown): value is MightyMikeTileSet {
  if (!isRecord(value)) return false;
  return Array.isArray(value.tileImages);
}

/**
 * Get the scene name from the map file URL
 * Example: "jurassic.map-1" -> "jurassic"
 */
function getSceneNameFromUrl(mapFileUrl: string): string | null {
  const filename = mapFileUrl.split("/").pop();
  if (!filename) return null;
  const match = filename.match(/^(\w+)\.map-\d+$/);
  return match ? match[1] ?? null : null;
}

/**
 * Load the palette from the scene-specific TGA file
 * Scene names map to TGA files:
 * - jurassic → dinoscene.tga
 * - candy → candyscene.tga
 * - fairy → fairyscene.tga
 * - clown → clownscene.tga
 * - bargain → bargainscene.tga
 */
async function loadScenePalette(
  sceneName: string,
  basePath?: string,
): Promise<Uint8Array | null> {
  console.log(
    `[PALETTE] loadScenePalette called with sceneName="${sceneName}", basePath="${basePath}"`,
  );
  try {
    // Map scene names to TGA filenames
    const sceneToTGA: Record<string, string> = {
      jurassic: "dinoscene.tga",
      candy: "candyscene.tga",
      fairy: "fairyscene.tga",
      clown: "clownscene.tga",
      bargain: "bargainscene.tga",
    };

    const tgaFilename = sceneToTGA[sceneName.toLowerCase()];
    console.log(
      `[PALETTE] Scene name lookup: "${sceneName}" -> "${
        tgaFilename || "NOT FOUND"
      }"`,
    );
    if (!tgaFilename) {
      console.warn(`[PALETTE] ✗ Unknown scene name: ${sceneName}`);
      return null;
    }

    // Derive TGA path from basePath (mapFileUrl) if provided, otherwise use default
    let tgaUrl: string;
    if (basePath && basePath.includes("/")) {
      // basePath has a directory, use it
      const dirPath = basePath.substring(0, basePath.lastIndexOf("/") + 1);
      tgaUrl = dirPath + tgaFilename;
    } else {
      // basePath is just a filename or empty, use the default asset path
      tgaUrl = `${import.meta.env.BASE_URL}assets/mightyMike/terrain/${tgaFilename}`;
    }
    console.log(`[PALETTE] Loading palette for scene "${sceneName}"`);
    console.log(`[PALETTE]   TGA filename expected: ${tgaFilename}`);
    console.log(`[PALETTE]   TGA URL: ${tgaUrl}`);

    const response = await fetch(tgaUrl);
    if (!response.ok) {
      console.warn(
        `[PALETTE] Failed to fetch TGA file: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const tgaBuffer = await response.arrayBuffer();
    const paletteResult = extractTGAPalette(tgaBuffer);

    if (!paletteResult) {
      console.warn("[PALETTE] Failed to extract palette from TGA file");
      return null;
    }

    // Convert to Uint8Array for later use
    const paletteArray = new Uint8Array(paletteResult.colors);

    return paletteArray;
  } catch (error) {
    console.warn("[PALETTE] Error loading palette:", error);
    return null;
  }
}

/**
 * Parse a MightyMike .map file and optionally load the corresponding .tileset file
 *
 * @param file - The .map file blob
 * @param setData - Callback to set the editor data
 * @param mapFileUrl - Optional URL of the map file (to derive tileset URL)
 * @param setMapImages - Optional callback to set the tile images (HTMLCanvasElement[])
 * @returns Result with the parsed level data
 */
export async function parseMightyMikeFile(
  file: Blob,
  setData: (data: AtomicLevelData) => void,
  mapFileUrl?: string,
  setMapImages?: (images: HTMLCanvasElement[]) => void,
): Promise<Result<LevelData, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
    const mapResult = parseMightyMikeMap(levelBuffer);
    if (!mapResult.ok) {
      return err(
        new Error(`Failed to parse MightyMike map: ${mapResult.error}`),
      );
    }

    console.log("MightyMike map parsed successfully:", {
      mapWidth: mapResult.value.mapWidth,
      mapHeight: mapResult.value.mapHeight,
      numItems: mapResult.value.numItems,
      items: mapResult.value.items,
    });

    // Try to load the tileset file
    let tilesetData = null;
    let paletteData: Uint8Array | null = null;

    // Load tileset if we have a URL
    if (mapFileUrl) {
      try {
        // Get the scene name to load the corresponding palette
        const sceneName = getSceneNameFromUrl(mapFileUrl);
        console.log(
          `[PALETTE LOAD] Extracted scene name from URL: "${sceneName}" (from ${mapFileUrl})`,
        );

        if (sceneName) {
          paletteData = await loadScenePalette(sceneName, mapFileUrl);
          console.log(
            `[PALETTE LOAD] Scene: ${sceneName}, Loaded: ${!!paletteData}, Length: ${
              paletteData?.length || 0
            }`,
          );

          if (paletteData) {
            // Check if palette has color variation
            const colors = new Set();
            for (let i = 0; i < Math.min(paletteData.length, 100); i += 4) {
              const r = paletteData[i];
              const g = paletteData[i + 1];
              const b = paletteData[i + 2];
              colors.add(`${r},${g},${b}`);
            }
            console.log(
              `[PALETTE LOAD] ✓ Palette loaded successfully with color variation:`,
              {
                uniqueColorsInFirst25: colors.size,
                sampleColors: Array.from(colors).slice(0, 5),
                paletteLength: paletteData.length,
                isUint8Array: paletteData instanceof Uint8Array,
              },
            );
          } else {
            console.warn(
              `[PALETTE LOAD] ✗ Failed to load palette for scene "${sceneName}" - will use grayscale fallback!`,
            );
          }
        } else {
          console.warn(
            `[PALETTE LOAD] ✗ Could not extract scene name from URL: ${mapFileUrl}`,
          );
        }

        // Replace .map-N with .tileset
        const tilesetUrl = mapFileUrl.replace(/\.map-\d+$/, ".tileset");
        console.log(`Attempting to load tileset from: ${tilesetUrl}`);

        const tilesetResponse = await fetch(tilesetUrl);
        if (tilesetResponse.ok) {
          const tilesetBuffer = await tilesetResponse.arrayBuffer();
          // Parse with the loaded palette if available
          if (paletteData) {
            const paletteColor17 = `RGB(${paletteData[17 * 4]},${
              paletteData[17 * 4 + 1]
            },${paletteData[17 * 4 + 2]})`;
            console.log(
              `[TILESET] ✓ Parsing WITH palette (color17=${paletteColor17}), size: ${paletteData.length} bytes`,
            );
          } else {
            console.warn(
              `[TILESET] ✗ Parsing WITHOUT palette - will use grayscale fallback!`,
            );
          }
          const tilesetResult = parseMightyMikeTileSet(
            tilesetBuffer,
            paletteData || undefined,
          );

          if (tilesetResult.ok) {
            tilesetData = tilesetResult.value;
            console.log("MightyMike tileset parsed successfully:", {
              numTileDefinitions: tilesetData.numTileDefinitions,
              numTileAttributeEntries: tilesetData.numTileAttributeEntries,
              numTileAnims: tilesetData.numTileAnims,
              paletteLoaded: !!paletteData,
            });
          } else {
            console.warn(`Failed to parse tileset: ${tilesetResult.error}`);
          }
        } else {
          console.warn(`Tileset file not found at ${tilesetUrl}`);
        }
      } catch (tilesetError) {
        console.warn("Error loading tileset:", tilesetError);
        // Continue without tileset data
      }
    }

    // Mighty Mike is a 2D game - only include relevant fields, no 3D/heightmap data
    // Create a header object that's compatible with StandardHeader format
    // Note: We cast to unknown and back to allow the tileset property which isn't in the base LevelData type
    const ottoCompatible = {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            // BaseHeader required fields
            version: 1,
            numItems: mapResult.value.numItems,
            mapWidth: mapResult.value.mapWidth,
            mapHeight: mapResult.value.mapHeight,
            tileSize: 32,
            minY: 0,
            maxY: 0,
            numSplines: 0,
            numFences: 0,
            // StandardHeader required fields
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
          // Flatten the 2D array and extract just the tile indices for standard LevelData
          obj: mapResult.value.mapImage
            .flat()
            .map((tileValue) => tileValue.tileIndex),
          order: 1,
        },
      },
      // Required for splitLevelData to create terrainData
      ItCo: {
        1000: {
          name: "Item Coordinates",
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
        1000: {
          name: "Metadata",
          obj: {
            // Store full Mighty Mike tile values for round-trip preservation
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
      // Include tileset data if available
      ...(tilesetData && { tileset: tilesetData }),
      // Include xlate table if available (for tile translation)
      ...(tilesetData?.xlateTable && {
        Xlat: {
          1000: {
            name: "Tile Translation Table",
            obj: tilesetData.xlateTable.map((idx) => ({ idx })),
          },
        },
      }),
    };

    console.log("Final MightyMike level data BEFORE splitLevelData:");
    const tilesetRaw = isRecord(ottoCompatible)
      ? ottoCompatible.tileset
      : undefined;
    const tilesetField = isMightyMikeTileSet(tilesetRaw)
      ? tilesetRaw
      : undefined;
    console.log({
      hasTileset: !!tilesetField,
      tilesetType: tilesetField?.constructor?.name,
      tileImagesLength: tilesetField?.tileImages?.length || 0,
      tileImagesType:
        tilesetField?.tileImages?.[0]?.constructor?.name || "unknown",
      numTilesInHeader: ottoCompatible.Hedr[1000].obj.numTiles,
      mapWidth: ottoCompatible.Hedr[1000].obj.mapWidth,
      mapHeight: ottoCompatible.Hedr[1000].obj.mapHeight,
      layrLength: ottoCompatible.Layr[1000].obj.length,
    });

    // Use ottoCompatible to populate AtomicLevelData
    const atomicData = splitLevelData(ottoCompatible as unknown as LevelData);
    console.log("MightyMike atomicData AFTER splitLevelData:", atomicData);

    setData(atomicData);

    // CRITICAL FIX: Extract and expose tileImages from the tileset
    // These HTMLCanvasElement objects need to be passed to the UI separately
    // since they're not preserved in AtomicLevelData
    if (
      tilesetField?.tileImages &&
      Array.isArray(tilesetField.tileImages) &&
      setMapImages
    ) {
      console.log(
        `[TILESET] Extracted ${tilesetField.tileImages.length} tile images for UI rendering`,
      );
      setMapImages(tilesetField.tileImages);
    }

    // Build the final LevelData with metadata
    const finalData = {
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
    // The structure is validated at build time via the spread from ottoCompatible
    function assertIsLevelData(x: unknown): asserts x is LevelData {
      if (typeof x !== "object" || x === null || !("Hedr" in x)) {
        throw new Error("Final data is not LevelData");
      }
    }
    assertIsLevelData(finalData);
    return ok(finalData);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Serialize a Mighty Mike level back to binary .map format
 */
export function serializeMightyMikeLevel(levelData: LevelData): ArrayBuffer {
  // 1. Get metadata
  const metadataRaw = levelData._metadata?.[1000];

  if (!isRecord(metadataRaw) || !isRecord(metadataRaw.obj)) {
    throw new Error("Missing Mighty Mike metadata structure (1000.obj) for serialization");
  }

  const metadata = metadataRaw.obj;

  if (!metadata.mightyMikeMapData || !metadata.mightyMikeTileValues) {
    throw new Error("Missing Mighty Mike metadata fields (mapData/tileValues) for serialization");
  }

  const mapData = metadata.mightyMikeMapData as MightyMikeMap;
  const tileValues = metadata.mightyMikeTileValues as any[]; // Array of tile objects

  // 2. Update Items
  const items = levelData.Itms?.[1000]?.obj || [];
  mapData.items = items.map((item: any) => ({
    x: item.x,
    y: item.z, // Note: LevelData uses x,z but MightyMike uses x,y
    type: item.type,
    p0: item.p0 ?? 0,
    p1: item.p1 ?? 0,
    p2: item.p2 ?? 0,
    p3: item.p3 ?? 0,
  }));
  mapData.numItems = mapData.items.length;

  // 3. Update Tiles
  const layr = levelData.Layr?.[1000]?.obj || [];

  if (layr.length !== tileValues.length) {
      console.warn(`Layer length (${layr.length}) does not match metadata tile values length (${tileValues.length}). Map size might have changed?`);
  }

  // Update tileValues with new indices from Layr
  const TILENUM_MASK = 0x07ff;

  layr.forEach((newTileIndex: number, i: number) => {
      if (i < tileValues.length) {
          const tile = tileValues[i];
          tile.tileIndex = newTileIndex;
          // Update rawValue: clear old index bits and set new index bits
          // Preserve high bits (flags)
          tile.rawValue = (tile.rawValue & ~TILENUM_MASK) | (newTileIndex & TILENUM_MASK);
      }
  });

  // Reconstruct mapImage (2D array)
  const mapImage = [];
  const width = mapData.mapWidth;
  const height = mapData.mapHeight;

  for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
          const i = y * width + x;
          if (i < tileValues.length) {
              row.push(tileValues[i]);
          } else {
              row.push({ rawValue: 0, tileIndex: 0, hasCollisionMask: false, usePixelAccurateCollision: false });
          }
      }
      mapImage.push(row);
  }
  mapData.mapImage = mapImage;

  // 4. Compress and return
  return mightyMikeMapToCompressedBinary(mapData);
}
