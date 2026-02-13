/**
 * Shared tile click handler logic
 */

import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import { KonvaEventObject } from "konva/lib/Node";
import type { GlobalsInterface } from "@/data/globals/globals";

export interface TileFlagOperation {
  add: number;
  remove: number;
}

export function createTileClickHandler(
  globals: GlobalsInterface,
  header: { mapWidth: number; mapHeight: number },
  setTerrainData: Updater<TerrainData>,
  tileEditingEnabled: boolean,
  brushType: "add" | "remove",
  topologyBrushRadius: number,
  flagOperation: TileFlagOperation,
) {
  return (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj || !data.Atrb?.[1000]?.obj) return;
      const baseX = centerX - radius;
      const baseY = centerY - radius;
      const size = radius * 2;

      for (let i = 0; i <= size; i += globals.TILE_SIZE) {
        for (let j = 0; j <= size; j += globals.TILE_SIZE) {
          const tileX = baseX + i;
          const tileY = baseY + j;

          const tileGridX = Math.floor(tileX / globals.TILE_SIZE);
          const tileGridY = Math.floor(tileY / globals.TILE_SIZE);

          if (
            tileGridX < 0 ||
            tileGridX >= header.mapWidth ||
            tileGridY < 0 ||
            tileGridY >= header.mapHeight
          )
            continue;

          const flatPos = tileGridY * header.mapWidth + tileGridX;
          const atrbIdx = data.Layr[1000].obj[flatPos];
          if (atrbIdx === undefined) continue;
          const attr = data.Atrb[1000].obj[atrbIdx];
          if (!attr) continue;

          if (brushType === "add") {
            attr.flags |= flagOperation.add;
          } else if (brushType === "remove") {
            attr.flags &= ~flagOperation.remove;
          }
        }
      }
    });
  };
}
