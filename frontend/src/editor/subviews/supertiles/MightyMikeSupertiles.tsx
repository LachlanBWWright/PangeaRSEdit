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
  getAltMapArray,
  getCollisionImages,
  getTileAttributes,
  isArray,
  isRecord,
  resolveImageIndices,
} from "./mightyMikeSupertilesHelpers";
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
        const meta =
          isRecord(data._metadata) &&
          isRecord(data._metadata[1000]) &&
          isRecord(data._metadata[1000].obj)
            ? data._metadata[1000].obj
            : undefined;
        const tileValues =
          meta && isArray(meta.mightyMikeTileValues)
            ? meta.mightyMikeTileValues
            : undefined;
        if (!tileValues || tileIdx < 0 || tileIdx >= tileValues.length) return;
        const tileVal = tileValues[tileIdx];
        if (!isRecord(tileVal)) return;
        tileVal.hasCollisionMask = !tileVal.hasCollisionMask;
      });
    },
    [setTerrainData],
  );

  const handleBrushParam = useCallback(
    (tileIdx: number) => {
      if (!paramBrushField) return;
      const resolvePhysicalIdx = () => {
        const logical = terrainData.Layr?.[1000]?.obj?.[tileIdx];
        if (logical === undefined) return null;
        const xlt = terrainData.Xlat?.[1000]?.obj;
        if (xlt && logical < xlt.length) {
          const entry = xlt[logical];
          if (isRecord(entry) && typeof entry.idx === "number")
            return entry.idx;
        }
        return typeof logical === "number" ? logical : null;
      };
      const physicalIdx = resolvePhysicalIdx();
      if (physicalIdx === null) return;
      setTerrainData((data) => {
        const tileset = isRecord(data.tileset) ? data.tileset : undefined;
        const attrs =
          tileset && isArray(tileset.tileAttributes)
            ? tileset.tileAttributes
            : undefined;
        const attr = attrs?.[physicalIdx];
        if (isRecord(attr)) {
          attr[paramBrushField] = paramBrushValue;
        }
        const levelAttr = data.Atrb?.[1000]?.obj?.[physicalIdx];
        if (
          levelAttr &&
          (paramBrushField === "flags" ||
            paramBrushField === "p0" ||
            paramBrushField === "p1")
        ) {
          levelAttr[paramBrushField] = paramBrushValue;
        }
      });
    },
    [
      paramBrushField,
      paramBrushValue,
      terrainData.Layr,
      terrainData.Xlat,
      setTerrainData,
    ],
  );

  const handleBrushAltMap = useCallback(
    (tileIdx: number) => {
      setTerrainData((data) => {
        let altMap2d = getAltMapArray(data._metadata);
        if (!altMap2d) {
          const meta: Record<string, unknown> = isRecord(data._metadata)
            ? data._metadata
            : {};
          const entry: Record<string, unknown> = isRecord(meta["1000"])
            ? meta["1000"]
            : { obj: {} };
          const obj: Record<string, unknown> = isRecord(entry["obj"])
            ? entry["obj"]
            : {};
          if (!isRecord(obj["mightyMikeMapData"])) {
            obj["mightyMikeMapData"] = {};
          }
          const mapDataEntry = obj["mightyMikeMapData"];
          if (!isRecord(mapDataEntry)) return;
          const w = mapWidth;
          const h = Math.ceil(layr.length / mapWidth);
          const newAltMap: number[][] = Array.from({ length: h }, () =>
            Array<number>(w).fill(0),
          );
          mapDataEntry["altMap"] = newAltMap;
          entry["obj"] = obj;
          meta["1000"] = entry;
          (data as Record<string, unknown>)["_metadata"] = meta;
          altMap2d = newAltMap;
        }
        const row = Math.floor(tileIdx / mapWidth);
        const col = tileIdx % mapWidth;
        const rowArr = altMap2d[row];
        if (isArray(rowArr) && col < rowArr.length) {
          rowArr[col] = altMapBrushValue;
        }
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
      const stage = e.target.getStage();
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return null;
      const col = Math.floor(pos.x / TILE_SIZE);
      const row = Math.floor(pos.y / TILE_SIZE);
      const mapHeight = Math.ceil(layr.length / mapWidth);
      if (col < 0 || row < 0 || col >= mapWidth || row >= mapHeight)
        return null;
      const tileIdx = row * mapWidth + col;
      if (tileIdx >= layr.length) return null;
      return tileIdx;
    },
    [mapWidth, layr.length],
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
