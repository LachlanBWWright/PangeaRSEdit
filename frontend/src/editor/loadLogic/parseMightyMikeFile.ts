import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { parseMightyMikeMap, parseMightyMikeTileSet } from "@/modelParsers/parseMightyMike";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";

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
          const tilesetUrl = mapFileUrl.replace(/\.map-\d+$/, '.tileset').replace(baseName + '.tileset', baseName + '.tileset');
          console.log(`Attempting to load tileset from: ${tilesetUrl}`);
          
          const tilesetResponse = await fetch(tilesetUrl);
          if (tilesetResponse.ok) {
            const tilesetBuffer = await tilesetResponse.arrayBuffer();
            const tilesetResult = parseMightyMikeTileSet(tilesetBuffer);
            
            if (tilesetResult.ok) {
              tilesetData = tilesetResult.value;
              console.log("MightyMike tileset parsed successfully:", {
                numTileDefinitions: tilesetData.numTileDefinitions,
                numTileAttributeEntries: tilesetData.numTileAttributeEntries,
                numTileAnims: tilesetData.numTileAnims,
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
    const ottoCompatible: LevelData = {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            numItems: mapResult.value.numItems,
            mapWidth: mapResult.value.mapWidth,
            mapHeight: mapResult.value.mapHeight,
            numTiles: tilesetData?.numTileDefinitions || 100,
            tileSize: 32,
            // Mighty Mike is 2D only - no splines, fences, water, or supertiles
            numSplines: 0,
            numFences: 0,
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
    };

    console.log("Final MightyMike level data:", ottoCompatible);

    setData(splitLevelData(ottoCompatible));
    return ok(ottoCompatible);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
