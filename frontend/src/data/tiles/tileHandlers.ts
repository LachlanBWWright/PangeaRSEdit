import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
import { Updater } from "use-immer";
import {
  TileViews,
  TILE_ATTRIB_BLANK,
  TILE_ATTRIB_ELECTROCUTE_AREA0,
  TILE_ATTRIB_ELECTROCUTE_AREA1,
} from "./tileAtoms";

// Type definition for tile operations
type PixelType = { x: number; y: number };

export function handleTileClick(
  x: number,
  y: number,
  setOtherData: Updater<Partial<ottoMaticLevel>>,
  tileView: TileViews,
  tileEditingEnabled: boolean,
  brushType: "add" | "remove",
  tileSize: number,
  brushRadius: number = 1,
) {
  if (!tileEditingEnabled) return;

  setOtherData((draft) => {
    const header = draft.Hedr?.[1000]?.obj;
    if (!header || !draft.Layr?.[1000]?.obj || !draft.Atrb?.[1000]?.obj) return;

    const centerX = Math.floor(x / tileSize);
    const centerY = Math.floor(y / tileSize);

    const radius = brushRadius - 1;
    const pixelList: PixelType[] = [];

    // Create brush pattern similar to the TopologyTiles component
    if (radius <= 0) {
      // If radius is 1 or less, just use a single pixel
      if (
        centerX >= 0 &&
        centerX < header.mapWidth &&
        centerY >= 0 &&
        centerY < header.mapHeight
      ) {
        pixelList.push({ x: centerX, y: centerY });
      }
    } else {
      // For larger radius, create a square pattern for non-topology components
      const diameter = radius * 2;
      const baseX = centerX - radius;
      const baseY = centerY - radius;

      for (let j = 0; j <= diameter; j++) {
        for (let i = 0; i <= diameter; i++) {
          const tileX = baseX + i;
          const tileY = baseY + j;

          // Check bounds
          if (
            tileX < 0 ||
            tileX >= header.mapWidth ||
            tileY < 0 ||
            tileY >= header.mapHeight
          ) {
            continue;
          }

          // For square pattern, all tiles within the square are included
          // No distance calculation needed, just add all tiles within the square
          pixelList.push({ x: tileX, y: tileY });
        }
      }
    }

    // Apply the changes to all pixels in the brush area
    for (const pixel of pixelList) {
      const tileIndex = pixel.y * header.mapWidth + pixel.x;
      const attrIndex = draft.Layr[1000].obj[tileIndex];

      if (attrIndex === undefined) continue;

      // Modify the flag based on the current view and brush type
      if (tileView === TileViews.Flags) {
        if (brushType === "add") {
          draft.Atrb[1000].obj[attrIndex].flags |= TILE_ATTRIB_BLANK;
        } else {
          draft.Atrb[1000].obj[attrIndex].flags &= ~TILE_ATTRIB_BLANK;
        }
      } else if (tileView === TileViews.ElectricFloor0) {
        if (brushType === "add") {
          draft.Atrb[1000].obj[attrIndex].flags |=
            TILE_ATTRIB_ELECTROCUTE_AREA0;
        } else {
          draft.Atrb[1000].obj[attrIndex].flags &=
            ~TILE_ATTRIB_ELECTROCUTE_AREA0;
        }
      } else if (tileView === TileViews.ElectricFloor1) {
        if (brushType === "add") {
          draft.Atrb[1000].obj[attrIndex].flags |=
            TILE_ATTRIB_ELECTROCUTE_AREA1;
        } else {
          draft.Atrb[1000].obj[attrIndex].flags &=
            ~TILE_ATTRIB_ELECTROCUTE_AREA1;
        }
      }
    }
  });
}
