import { Layer, Image, Rect } from "react-konva";
import { memo, useCallback, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import {
  CollisionBrushMode,
  ShowMightyMikeParamsOverlay,
  ParamBrushField,
  ParamBrushValue,
} from "@/data/game/gameAtoms";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import type Konva from "konva";
import { View } from "@/editor/viewEnum";
import { AltMapBrushValue } from "../mightymike/MightyMikeAltMapEditor";
import {
  TILE_SIZE,
  buildAltMapCanvas,
  buildBackgroundCanvas,
  buildCollisionCanvas,
  buildParamsCanvas,
  flattenAltMap,
  getCollisionImages,
  getTileAttributes,
  resolveImageIndices,
} from "./mightyMikeSupertilesHelpers";
import {
  applyAltMapBrush,
  applyCollisionMaskToggle,
  applyParamBrush,
  getTileIndexFromKonvaEvent,
} from "@/editor/subviews/supertiles/mightyMikeSupertilesState";
interface MightyMikeSupertilesProps {
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
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const collisionBrushMode = useAtomValue(CollisionBrushMode);
  const altMapBrushValue = useAtomValue(AltMapBrushValue);
  const showParamsOverlay = useAtomValue(ShowMightyMikeParamsOverlay);
  const paramBrushField = useAtomValue(ParamBrushField);
  const paramBrushValue = useAtomValue(ParamBrushValue);
  const showAltMap = view === View.tiles;
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const xlatTable = terrainData.Xlat?.[1000]?.obj;
  const collisionImages = useMemo(
    () => getCollisionImages(terrainData.tileset),
    [terrainData.tileset],
  );

  const altMapFlat = useMemo<number[]>(
    () => flattenAltMap(terrainData._metadata),
    [terrainData._metadata],
  );

  const tileAttributes = useMemo(
    () => getTileAttributes(terrainData.tileset),
    [terrainData.tileset],
  );
  const handleBrushTile = useCallback(
    (tileIdx: number) => {
      setTerrainData((data) => {
        applyCollisionMaskToggle(data, tileIdx);
      });
    },
    [setTerrainData],
  );

  const handleBrushParam = useCallback(
    (tileIdx: number) => {
      if (!paramBrushField) return;
      setTerrainData((data) => {
        applyParamBrush(data, tileIdx, paramBrushField, paramBrushValue);
      });
    },
    [paramBrushField, paramBrushValue, setTerrainData],
  );

  const handleBrushAltMap = useCallback(
    (tileIdx: number) => {
      setTerrainData((data) => {
        applyAltMapBrush(
          data,
          tileIdx,
          mapWidth,
          layr.length,
          altMapBrushValue,
        );
      });
    },
    [setTerrainData, mapWidth, altMapBrushValue, layr.length],
  );
  const mapHeight = Math.ceil(layr.length / mapWidth);

  const resolvedImageIndices = useMemo(
    () => resolveImageIndices(layr, xlatTable, mapImages.length),
    [layr, xlatTable, mapImages.length],
  );

  const backgroundCanvas = useMemo(
    () =>
      buildBackgroundCanvas(
        mapImages,
        layr,
        mapWidth,
        mapHeight,
        resolvedImageIndices,
      ),
    [resolvedImageIndices, mapImages, mapWidth, mapHeight, layr],
  );

  const collisionCanvas = useMemo(
    () =>
      buildCollisionCanvas(
        showCollisionOverlay,
        mapWidth,
        mapHeight,
        layr,
        resolvedImageIndices,
        collisionImages,
      ),
    [
      showCollisionOverlay,
      resolvedImageIndices,
      collisionImages,
      layr,
      mapWidth,
      mapHeight,
    ],
  );

  const altMapCanvas = useMemo(
    () => buildAltMapCanvas(showAltMap, mapWidth, mapHeight, altMapFlat),
    [showAltMap, altMapFlat, mapWidth, mapHeight],
  );

  const paramsCanvas = useMemo(
    () =>
      buildParamsCanvas(
        showParamsOverlay,
        tileAttributes,
        mapWidth,
        mapHeight,
        layr,
        resolvedImageIndices,
      ),
    [
      showParamsOverlay,
      tileAttributes,
      resolvedImageIndices,
      layr,
      mapWidth,
      mapHeight,
    ],
  );

  const getTileIndexFromEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): number | null => {
      return getTileIndexFromKonvaEvent(
        e,
        TILE_SIZE,
        mapWidth,
        mapHeight,
        layr.length,
      );
    },
    [mapWidth, mapHeight, layr.length],
  );
  const handleCanvasClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const tileIdx = getTileIndexFromEvent(e);
      if (tileIdx === null) return;
      if (showAltMap) {
        handleBrushAltMap(tileIdx);
      } else if (paramBrushField) {
        handleBrushParam(tileIdx);
      } else if (collisionBrushMode) {
        handleBrushTile(tileIdx);
      } else {
        setSelectedTile(tileIdx);
      }
    },
    [
      showAltMap,
      collisionBrushMode,
      paramBrushField,
      getTileIndexFromEvent,
      handleBrushAltMap,
      handleBrushTile,
      handleBrushParam,
      setSelectedTile,
    ],
  );
  const handleCanvasMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.buttons !== 1) return;
      const tileIdx = getTileIndexFromEvent(e);
      if (tileIdx === null) return;
      if (showAltMap) {
        handleBrushAltMap(tileIdx);
      } else if (paramBrushField) {
        handleBrushParam(tileIdx);
      } else if (collisionBrushMode) {
        handleBrushTile(tileIdx);
      }
    },
    [
      showAltMap,
      collisionBrushMode,
      paramBrushField,
      getTileIndexFromEvent,
      handleBrushAltMap,
      handleBrushTile,
      handleBrushParam,
    ],
  );
  const selX =
    selectedTile !== null ? (selectedTile % mapWidth) * TILE_SIZE : -1;
  const selY =
    selectedTile !== null
      ? Math.floor(selectedTile / mapWidth) * TILE_SIZE
      : -1;
  if (mapImages.length === 0 || layr.length === 0) {
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
      {selectedTile !== null && selX >= 0 && selY >= 0 && (
        <Rect
          x={selX}
          y={selY}
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
