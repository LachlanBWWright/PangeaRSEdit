import { LevelData, TerrainItem } from "@/python/structSpecs/LevelTypes";
import { EditOperation, MoveItemOperation, UpdateItemParamsOperation } from "@/data/levelEdit/editOperations";

/**
 * Generate random valid move operations for items in a level
 */
export function generateRandomMoveOperations(
  levelData: LevelData,
  count: number,
): MoveItemOperation[] {
  const items = levelData.Itms?.[1000]?.obj ?? [];
  if (items.length === 0) return [];

  const operations: MoveItemOperation[] = [];

  for (let i = 0; i < count; i++) {
    const itemIndex = Math.floor(Math.random() * items.length);
    const item = items[itemIndex];
    if (!item) continue;

    // Random offset within reasonable bounds
    const offsetX = Math.round((Math.random() - 0.5) * 200);
    const offsetZ = Math.round((Math.random() - 0.5) * 200);

    operations.push({
      type: "MoveItem",
      itemIndex,
      oldX: item.x,
      oldZ: item.z,
      newX: item.x + offsetX,
      newZ: item.z + offsetZ,
    });
  }

  return operations;
}

/**
 * Generate operations that modify every item in a level
 */
export function generateExhaustiveItemOperations(
  levelData: LevelData,
): EditOperation[] {
  const items = levelData.Itms?.[1000]?.obj ?? [];
  const operations: EditOperation[] = [];

  items.forEach((item, index) => {
    // Move each item
    operations.push({
      type: "MoveItem",
      itemIndex: index,
      oldX: item.x,
      oldZ: item.z,
      newX: item.x + 10,
      newZ: item.z + 10,
    });

    // Modify params
    operations.push({
      type: "UpdateItemParams",
      itemIndex: index,
      oldParams: { flags: item.flags, p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 },
      newParams: { flags: item.flags + 1, p0: item.p0 + 1, p1: item.p1, p2: item.p2, p3: item.p3 },
    });
  });

  return operations;
}

/**
 * Generate operations for terrain height changes
 */
export function generateTerrainHeightOperations(
  levelData: LevelData,
  count: number,
): EditOperation[] {
  const header = levelData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  const operations: EditOperation[] = [];

  const ycrd = levelData.YCrd[1000].obj;
  if (!ycrd) return [];

  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * (mapWidth + 1));
    const z = Math.floor(Math.random() * (mapHeight + 1));
    const index = z * (mapWidth + 1) + x;

    if (index >= 0 && index < ycrd.length) {
      const oldHeight = ycrd[index];
      operations.push({
        type: "UpdateTerrainHeight",
        x,
        z,
        oldHeight,
        newHeight: oldHeight + Math.round((Math.random() - 0.5) * 100),
      });
    }
  }

  return operations;
}
