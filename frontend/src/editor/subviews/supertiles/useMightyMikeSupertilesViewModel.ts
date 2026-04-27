import type Konva from "konva";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import {
  CollisionBrushMode,
  ParamBrushField,
  ParamBrushValue,
  ShowMightyMikeParamsOverlay,
} from "@/data/game/gameAtoms";
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
import type { MightyMikeSupertilesProps } from "./MightyMikeSupertiles";

interface TileBounds {
  x: number;
  y: number;
}

interface MightyMikeSupertilesViewModel {
  showAltMap: boolean;
  showParamsOverlay: boolean;
  mapWidth: number;
  mapHeight: number;
  hasCanvasContent: boolean;
  backgroundCanvas: HTMLCanvasElement | null;
  collisionCanvas: HTMLCanvasElement | null;
  altMapCanvas: HTMLCanvasElement | null;
  paramsCanvas: HTMLCanvasElement | null;
  selectedTileBounds: TileBounds | null;
  handleCanvasClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleCanvasMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

/** Builds the derived canvas state and brush handlers for the Mighty Mike supertile editor. */
export function useMightyMikeSupertilesViewModel({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  showCollisionOverlay = false,
  view,
}: MightyMikeSupertilesProps): MightyMikeSupertilesViewModel {
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
  const mapHeight = Math.ceil(layr.length / mapWidth);
  const hasCanvasContent = mapImages.length > 0 && layr.length > 0;

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

  const applyBrushToTile = useCallback(
    (tileIdx: number) => {
      if (showAltMap) {
        handleBrushAltMap(tileIdx);
        return;
      }

      if (paramBrushField) {
        handleBrushParam(tileIdx);
        return;
      }

      if (collisionBrushMode) {
        handleBrushTile(tileIdx);
        return;
      }

      setSelectedTile(tileIdx);
    },
    [
      showAltMap,
      paramBrushField,
      collisionBrushMode,
      handleBrushAltMap,
      handleBrushParam,
      handleBrushTile,
      setSelectedTile,
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
      applyBrushToTile(tileIdx);
    },
    [applyBrushToTile, getTileIndexFromEvent],
  );

  const handleCanvasMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.buttons !== 1) return;
      const tileIdx = getTileIndexFromEvent(e);
      if (tileIdx === null) return;
      applyBrushToTile(tileIdx);
    },
    [applyBrushToTile, getTileIndexFromEvent],
  );

  const selectedTileBounds =
    selectedTile === null
      ? null
      : {
          x: (selectedTile % mapWidth) * TILE_SIZE,
          y: Math.floor(selectedTile / mapWidth) * TILE_SIZE,
        };

  return {
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
  };
}
