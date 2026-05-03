import { Layer, Image, Rect } from "react-konva";
import { memo } from "react";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { View } from "@/editor/viewEnum";
import { TILE_SIZE } from "./mightyMikeSupertilesHelpers";
import { useMightyMikeSupertilesViewModel } from "./useMightyMikeSupertilesViewModel";

export interface MightyMikeSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  showCollisionOverlay?: boolean;
  view?: View;
}
const MightyMikeSupertilesComponent = ({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  showCollisionOverlay = false,
  view,
}: MightyMikeSupertilesProps) => {
  const {
    showAltMap,
    showParamsOverlay,
    mapWidth,
    mapHeight,
    hasCanvasContent,
    backgroundCanvas,
    collisionCanvas,
    altMapCanvas,
    paramsCanvas,
    selectedTileBounds,
    handleCanvasClick,
    handleCanvasMouseMove,
  } = useMightyMikeSupertilesViewModel({
    headerData,
    terrainData,
    setTerrainData,
    mapImages,
    showCollisionOverlay,
    view,
  });

  if (!hasCanvasContent) {
    return <Layer />;
  }
  return (
    <Layer>
      {}
      {backgroundCanvas && (
        <Image
          image={backgroundCanvas}
          x={0}
          y={0}
          width={mapWidth * TILE_SIZE}
          height={mapHeight * TILE_SIZE}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
        />
      )}
      {}
      {showCollisionOverlay && collisionCanvas && (
        <Image
          image={collisionCanvas}
          x={0}
          y={0}
          width={mapWidth * TILE_SIZE}
          height={mapHeight * TILE_SIZE}
          listening={false}
        />
      )}
      {}
      {showParamsOverlay && paramsCanvas && (
        <Image
          image={paramsCanvas}
          x={0}
          y={0}
          width={mapWidth * TILE_SIZE}
          height={mapHeight * TILE_SIZE}
          listening={false}
        />
      )}
      {}
      {showAltMap && altMapCanvas && (
        <Image
          image={altMapCanvas}
          x={0}
          y={0}
          width={mapWidth * TILE_SIZE}
          height={mapHeight * TILE_SIZE}
          listening={false}
        />
      )}
      {}
      {selectedTileBounds && (
        <Rect
          x={selectedTileBounds.x}
          y={selectedTileBounds.y}
          width={TILE_SIZE}
          height={TILE_SIZE}
          stroke="red"
          strokeWidth={2}
          fill="transparent"
          listening={false}
        />
      )}
    </Layer>
  );
};
export const MightyMikeSupertiles = memo(MightyMikeSupertilesComponent);
MightyMikeSupertiles.displayName = "MightyMikeSupertiles";
