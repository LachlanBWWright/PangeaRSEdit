import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { parseMightyMikeMap, parseMightyMikeTileSet } from "@/modelParsers/parseMightyMike";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";
import { extractTGAPalette } from "@/utils/tgaParser";

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

    // Try to load the tileset file if we have the URL
    let tilesetData = null;
    if (mapFileUrl) {
      try {
        // Extract the base name from the map file (e.g., "bargain" from "bargain.map-1")
        const baseName = mapFileUrl.split('/').pop()?.split('.map-')[0];
        if (baseName) {
          // Replace .map-N with .tileset
          const tilesetUrl = mapFileUrl.replace(/\.map-\d+$/, '.tileset');
          console.log(`Attempting to load tileset from: ${tilesetUrl}`);

          // Try to load scene-specific TGA palette
          const tgaFileName = mapFileUrl.replace(/\.map-\d+$/, '').split('/').pop();
          let sceneIndex = -1;
          const sceneNames = ['jurassic', 'candy', 'fairy', 'clown', 'bargain'];
          const tgaNames = ['dinoscene.tga', 'candyscene.tga', 'fairyscene.tga', 'clownscene.tga', 'bargainscene.tga'];

          sceneIndex = sceneNames.indexOf(tgaFileName || '');
          let palette: Uint8Array | undefined;

          if (sceneIndex >= 0 && sceneIndex < tgaNames.length) {
            try {
              const tgaUrl = mapFileUrl.substring(0, mapFileUrl.lastIndexOf('/') + 1) + tgaNames[sceneIndex];
              console.log(`Attempting to load palette from: ${tgaUrl}`);

              const tgaResponse = await fetch(tgaUrl);
              if (tgaResponse.ok) {
                const tgaBuffer = await tgaResponse.arrayBuffer();
                const tgaPalette = extractTGAPalette(tgaBuffer);
                if (tgaPalette) {
                  // Convert Uint8ClampedArray to Uint8Array
                  palette = new Uint8Array(tgaPalette.colors);
                  console.log(`Loaded ${baseName} palette from TGA file`);
                } else {
                  console.warn(`Failed to extract palette from TGA file`);
                }
              } else {
                console.warn(`TGA palette file not found at ${tgaUrl}`);
              }
            } catch (tgaError) {
              console.warn("Error loading TGA palette:", tgaError);
              // Continue without palette data - will use grayscale fallback
            }
          }

          const tilesetResponse = await fetch(tilesetUrl);
          if (tilesetResponse.ok) {
            const tilesetBuffer = await tilesetResponse.arrayBuffer();
            const tilesetResult = parseMightyMikeTileSet(tilesetBuffer, palette);

            if (tilesetResult.ok) {
              tilesetData = tilesetResult.value;
              console.log("MightyMike tileset parsed successfully:", {
                numTileDefinitions: tilesetData.numTileDefinitions,
                numTileAttributeEntries: tilesetData.numTileAttributeEntries,
                numTileAnims: tilesetData.numTileAnims,
                paletteLoaded: !!palette,
              });
            } else {
              console.warn(`Failed to parse tileset: ${tilesetResult.error}`);
            }
          } else {
            console.warn(`Tileset file not found at ${tilesetUrl}`);
          }
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

    const atomicData = splitLevelData(ottoCompatible as LevelData);
    console.log("MightyMike atomicData AFTER splitLevelData:", atomicData);

    setData(atomicData);
    return ok(ottoCompatible as LevelData);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
