import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";
import {
  TileViews,
  TILE_ATTRIB_BLANK,
  TILE_ATTRIB_ELECTROCUTE_AREA0,
  TILE_ATTRIB_ELECTROCUTE_AREA1,
} from "./tileAtoms";

export function handleTileClick(
  x: number,
  y: number,
  data: ottoMaticLevel,
  setData: Updater<ottoMaticLevel>,
  tileView: TileViews,
  tileEditingEnabled: boolean,
  brushType: "add" | "remove",
  tileSize: number,
) {
  if (!tileEditingEnabled) return;

  setData((draft) => {
    const header = draft.Hedr?.[1000]?.obj;
    if (!header) return;

    // Calculate the index in the tile grid
    const tileX = Math.floor(x / tileSize);
    const tileY = Math.floor(y / tileSize);

    // Ensure we're in bounds
    if (
      tileX < 0 ||
      tileX >= header.mapWidth ||
      tileY < 0 ||
      tileY >= header.mapHeight
    ) {
      return;
    }

    // Get the tile attribute index
    const tileIndex = tileY * header.mapWidth + tileX;
    const attrIndex = draft.Layr[1000].obj[tileIndex];

    if (attrIndex === undefined) return;

    // Modify the flag based on the current view and brush type
    if (tileView === TileViews.Flags) {
      if (brushType === "add") {
        draft.Atrb[1000].obj[attrIndex].flags |= TILE_ATTRIB_BLANK;
      } else {
        draft.Atrb[1000].obj[attrIndex].flags &= ~TILE_ATTRIB_BLANK;
      }
    } else if (tileView === TileViews.ElectricFloor0) {
      if (brushType === "add") {
        draft.Atrb[1000].obj[attrIndex].flags |= TILE_ATTRIB_ELECTROCUTE_AREA0;
      } else {
        draft.Atrb[1000].obj[attrIndex].flags &= ~TILE_ATTRIB_ELECTROCUTE_AREA0;
      }
    } else if (tileView === TileViews.ElectricFloor1) {
      if (brushType === "add") {
        draft.Atrb[1000].obj[attrIndex].flags |= TILE_ATTRIB_ELECTROCUTE_AREA1;
      } else {
        draft.Atrb[1000].obj[attrIndex].flags &= ~TILE_ATTRIB_ELECTROCUTE_AREA1;
      }
    }
  });
}
