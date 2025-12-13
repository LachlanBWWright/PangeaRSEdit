import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { parseMightyMikeMap, parseMightyMikeTileSet } from "@/modelParsers/parseMightyMike";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import { extractTGAPalette } from "@/utils/tgaParser";

/**
 * Get the scene name from the map file URL
 * Example: "jurassic.map-1" -> "jurassic"
 */
function getSceneNameFromUrl(mapFileUrl: string): string | null {
  const filename = mapFileUrl.split('/').pop();
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
async function loadScenePalette(sceneName: string, basePath?: string): Promise<Uint8Array | null> {
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
    if (!tgaFilename) {
      console.warn(`[PALETTE] Unknown scene name: ${sceneName}`);
      return null;
    }

    // Derive TGA path from basePath (mapFileUrl) if provided, otherwise use default
    let tgaUrl: string;
    if (basePath) {
      // Replace .map-N with the TGA filename to get correct directory
      tgaUrl = basePath.replace(/\.map-\d+$/, `.${tgaFilename.split('.')[0]}.tga`);
      // Actually, just replace the whole filename
      const dirPath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
      tgaUrl = dirPath + tgaFilename;
    } else {
      tgaUrl = `/PangeaRSEdit/assets/mightyMike/terrain/${tgaFilename}`;
    }
    console.log(`[PALETTE] Loading palette for scene "${sceneName}" from: ${tgaUrl}`);

    const response = await fetch(tgaUrl);
    if (!response.ok) {
      console.warn(`[PALETTE] Failed to fetch TGA file: ${response.status} ${response.statusText}`);
      return null;
    }

    const tgaBuffer = await response.arrayBuffer();
    const paletteResult = extractTGAPalette(tgaBuffer);

    if (!paletteResult) {
      console.warn("[PALETTE] Failed to extract palette from TGA file");
      return null;
    }

    console.log("[PALETTE] Successfully extracted palette from TGA:", {
      sceneName,
      tgaFile: tgaFilename,
      colorCount: 256,
      firstColor: [paletteResult.colors[0], paletteResult.colors[1], paletteResult.colors[2], paletteResult.colors[3]],
    });

    return new Uint8Array(paletteResult.colors);
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
 * @returns Result with the parsed level data
 */
export async function parseMightyMikeFile(
  file: Blob,
  setData: (data: AtomicLevelData) => void,
  mapFileUrl?: string,
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
        if (sceneName) {
          paletteData = await loadScenePalette(sceneName, mapFileUrl);
          console.log(`[PALETTE LOAD] Scene: ${sceneName}, Loaded: ${!!paletteData}, Length: ${paletteData?.length || 0}`);
          if (paletteData) {
            // Check if palette has color variation
            const colors = new Set();
            for (let i = 0; i < Math.min(paletteData.length, 100); i += 4) {
              const r = paletteData[i];
              const g = paletteData[i + 1];
              const b = paletteData[i + 2];
              colors.add(`${r},${g},${b}`);
            }
            console.log(`[PALETTE LOAD] Unique colors in first 25: ${colors.size}, samples:`, Array.from(colors).slice(0, 5));
          }
        }

        // Replace .map-N with .tileset
        const tilesetUrl = mapFileUrl.replace(/\.map-\d+$/, '.tileset');
        console.log(`Attempting to load tileset from: ${tilesetUrl}`);

        const tilesetResponse = await fetch(tilesetUrl);
        if (tilesetResponse.ok) {
          const tilesetBuffer = await tilesetResponse.arrayBuffer();
          // Parse with the loaded palette if available
          console.log(`[TILESET] Parsing with palette: ${!!paletteData}, palette size: ${paletteData?.length || 0}`);
          const tilesetResult = parseMightyMikeTileSet(tilesetBuffer, paletteData || undefined);

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
          obj: mapResult.value.mapImage.flat(),
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
          obj: new Array((mapResult.value.mapWidth * mapResult.value.mapHeight)).fill(0),
          order: 4,
        },
      },
      _metadata: {
        1000: {
          name: "Metadata",
          obj: {},
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
      // Include tileset data if available
      ...(tilesetData && { tileset: tilesetData }),
      // Include xlate table if available (for tile translation)
      ...(tilesetData?.xlateTable && {
        Xlat: {
          1000: {
            name: "Tile Translation Table",
            obj: tilesetData.xlateTable.map(idx => ({ idx })),
          }
        }
      }),
    };

    console.log("Final MightyMike level data BEFORE splitLevelData:");
    const tilesetField = (ottoCompatible as unknown as Record<string, any>).tileset;
    console.log({
      hasTileset: !!tilesetField,
      tilesetType: tilesetField?.constructor?.name,
      tileImagesLength: tilesetField?.tileImages?.length || 0,
      tileImagesType: tilesetField?.tileImages?.[0]?.constructor?.name || "unknown",
      numTilesInHeader: ottoCompatible.Hedr[1000].obj.numTiles,
      mapWidth: ottoCompatible.Hedr[1000].obj.mapWidth,
      mapHeight: ottoCompatible.Hedr[1000].obj.mapHeight,
      layrLength: ottoCompatible.Layr[1000].obj.length,
    });

    const atomicData = splitLevelData(ottoCompatible as unknown as LevelData);
    console.log("MightyMike atomicData AFTER splitLevelData:", atomicData);

    setData(atomicData);
    return ok(ottoCompatible as unknown as LevelData);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
