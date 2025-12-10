import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Result, ok, err } from "@/types/result";
import { parseMightyMikeMap } from "@/modelParsers/parseMightyMike";
import { splitLevelData, AtomicLevelData } from "@/data/utils/levelDataUtils";

export async function parseMightyMikeFile(
  file: Blob,
  setData: (data: AtomicLevelData) => void,
): Promise<Result<LevelData, Error>> {
  try {
    const levelBuffer = await file.arrayBuffer();
    const mapResult = parseMightyMikeMap(levelBuffer);
    if (!mapResult.ok) {
      return err(
        new Error(`Failed to parse MightyMike map: ${mapResult.error}`),
      );
    }

    const ottoCompatible: LevelData = {
      Hedr: {
        version: 1,
        numItems: mapResult.value.numItems,
        mapWidth: mapResult.value.mapWidth,
        mapHeight: mapResult.value.mapHeight,
        numTilePages: 1,
        numTiles: 100,
        tileSize: 32,
        minY: 0,
        maxY: 100,
        numSplines: 0,
        numFences: 0,
        numUniqueSupertiles: 1,
        numWaterPatches: 0,
        numCheckpoints: 0,
      },
      Layr: mapResult.value.mapImage.flat(),
      YCrd: new Array(
        mapResult.value.mapWidth * mapResult.value.mapHeight,
      ).fill(0),
      Itms: mapResult.value.items.map((item) => ({
        x: item.x,
        z: item.y,
        type: item.type,
        p0: item.p0,
        p1: item.p1,
        p2: item.p2,
        p3: item.p3,
        flags: 0,
      })),
    };

    setData(splitLevelData(ottoCompatible));
    return ok(ottoCompatible);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
