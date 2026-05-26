import type Konva from "konva";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import {
  MightyMikeCanvasEditMode,
  MightyMikeCollisionBrushModeValue,
  MightyMikeFlagBrushBit,
  MightyMikeFlagBrushModeValue,
  MightyMikeOverlayMode,
  MightyMikeParamsOverlayFlagBit,
  ParamBrushValue,
} from "@/data/game/gameAtoms";
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
  getTileValueEntries,
  resolveImageIndices,
} from "./mightyMikeSupertilesHelpers";
import {
  applyAltMapBrush,
  applyCollisionMaskValue,
  applyFlagBrush,
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
  showCollisionOverlay: boolean;
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
}: MightyMikeSupertilesProps): MightyMikeSupertilesViewModel {
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const canvasEditMode = useAtomValue(MightyMikeCanvasEditMode);
  const collisionBrushValue = useAtomValue(MightyMikeCollisionBrushModeValue);
  const flagBrushBit = useAtomValue(MightyMikeFlagBrushBit);
  const flagBrushModeValue = useAtomValue(MightyMikeFlagBrushModeValue);
  const overlayMode = useAtomValue(MightyMikeOverlayMode);
  const altMapBrushValue = useAtomValue(AltMapBrushValue);
  const paramsOverlayFlagBit = useAtomValue(MightyMikeParamsOverlayFlagBit);
  const paramBrushValue = useAtomValue(ParamBrushValue);
  const showCollisionOverlay = overlayMode === "collision";
  const showParamsOverlay =
    overlayMode === "solidEdges" ||
    overlayMode === "flagsAny" ||
    overlayMode === "flagBit" ||
    overlayMode === "p0" ||
    overlayMode === "p1";
  const showAltMap = overlayMode === "altMap" || canvasEditMode === "altMap";
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const layerAttributes = useMemo(
    () => terrainData.Atrb?.[1000]?.obj ?? [],
    [terrainData.Atrb],
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
  const tileValues = useMemo(
    () => getTileValueEntries(terrainData._metadata),
    [terrainData._metadata],
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

  const collisionCanvas = useMemo(() => {
    if (!showCollisionOverlay) {
      return null;
    }
    return buildCollisionCanvas(
      mapWidth,
      mapHeight,
      resolvedImageIndices,
      collisionImages,
      tileValues,
    );
  }, [
    showCollisionOverlay,
    resolvedImageIndices,
    collisionImages,
    tileValues,
    mapWidth,
    mapHeight,
  ]);

  const altMapCanvas = useMemo(
    () => buildAltMapCanvas(showAltMap, mapWidth, mapHeight, altMapFlat),
    [showAltMap, altMapFlat, mapWidth, mapHeight],
  );

  const paramsCanvas = useMemo(() => {
    if (!showParamsOverlay) {
      return null;
    }
    return buildParamsCanvas(
      overlayMode === "solidEdges" ||
        overlayMode === "flagBit" ||
        overlayMode === "p0" ||
        overlayMode === "p1"
        ? overlayMode
        : "flagsAny",
      paramsOverlayFlagBit,
      layerAttributes,
      mapWidth,
      mapHeight,
      layr,
    );
  }, [
    showParamsOverlay,
    overlayMode,
    paramsOverlayFlagBit,
    layerAttributes,
    layr,
    mapWidth,
    mapHeight,
  ]);

  const handleBrushCollision = useCallback(
    (tileIdx: number) => {
      setTerrainData((data) => {
        applyCollisionMaskValue(
          data,
          tileIdx,
          collisionBrushValue === "enabled",
        );
      });
    },
    [collisionBrushValue, setTerrainData],
  );

  const handleBrushParam = useCallback(
    (tileIdx: number, field: "flags" | "p0" | "p1") => {
      setTerrainData((data) => {
        applyParamBrush(data, tileIdx, field, paramBrushValue);
      });
    },
    [paramBrushValue, setTerrainData],
  );

  const handleBrushFlag = useCallback(
    (tileIdx: number) => {
      setTerrainData((data) => {
        applyFlagBrush(
          data,
          tileIdx,
          flagBrushBit,
          flagBrushModeValue === "enabled",
        );
      });
    },
    [flagBrushBit, flagBrushModeValue, setTerrainData],
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
      if (canvasEditMode === "altMap") {
        handleBrushAltMap(tileIdx);
        return;
      }

      if (canvasEditMode === "flags") {
        handleBrushFlag(tileIdx);
        return;
      }

      if (canvasEditMode === "p0") {
        handleBrushParam(tileIdx, "p0");
        return;
      }

      if (canvasEditMode === "p1") {
        handleBrushParam(tileIdx, "p1");
        return;
      }

      if (canvasEditMode === "collision") {
        handleBrushCollision(tileIdx);
        return;
      }

      setSelectedTile(tileIdx);
    },
    [
      canvasEditMode,
      handleBrushAltMap,
      handleBrushFlag,
      handleBrushParam,
      handleBrushCollision,
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
    showCollisionOverlay,
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
