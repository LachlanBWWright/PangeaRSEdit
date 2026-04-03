/**
 * Generic flag-based tile editor component
 * Eliminates duplication between EmptyTiles, ElectricFloor0Tiles, and ElectricFloor1Tiles
 */

import { useMemo } from "react";
import { Layer, Image } from "react-konva";
import { useAtomValue } from "jotai";
import type { KonvaEventObject } from "konva/lib/Node";
import type { HeaderData, TerrainData, TileAttribute } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";
import { Globals } from "../../../data/globals/globals";
import {
  TileEditingEnabled,
  TileBrushType,
  TopologyBrushRadius,
} from "../../../data/tiles/tileAtoms";
import { createImageCanvas } from "./tilesUtils";

export interface FlagTileEditorProps {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
  flagBit: number;
  flagToColour: (flags: number) => [number, number, number, number];
}

export function FlagTileEditor({
  headerData,
  setTerrainData,
  tileGrid,
  flagBit,
  flagToColour,
}: FlagTileEditorProps) {
  const globals = useAtomValue(Globals);
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid, flagToColour]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
    const result = createImageCanvas(
      header.mapWidth,
      header.mapHeight,
      coordColours,
    );
    if (result.isErr()) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [header, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    const stageScale = stage?.scaleX() ?? 1;
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = Math.max(0, topologyBrushRadius) / Math.max(1, stageScale);

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
            attr.flags |= flagBit;
          } else if (brushType === "remove") {
            attr.flags &= ~flagBit;
          }
        }
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        image={imgCanvas ?? undefined}
        onClick={handleTileClickEvent}
      />
    </Layer>
  );
}
