/**
 * MightyMikeSupertiles.tsx
 *
 * Renders tiles for Mighty Mike's 2D tile system.
 * Mighty Mike uses a simple 2D grid of tiles (no supertiles).
 * Tiles are indexed through a translation (xlate) table to map logical indices to physical tile images.
 *
 * Performance: all tiles are pre-baked into a single background canvas (one Konva Image node)
 * rather than rendering one Image per tile, which was causing significant Konva overhead.
 */

import { Layer, Image, Rect } from "react-konva";
import { memo, useCallback, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { CollisionBrushMode } from "@/data/game/gameAtoms";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import type Konva from "konva";
import { View } from "@/editor/viewEnum";
import { AltMapBrushValue, ALT_TILE_OPTIONS } from "../mightymike/MightyMikeAltMapEditor";

// Type guard helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

interface MightyMikeSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  showCollisionOverlay?: boolean;
  /** Current editor view — used to show alt-map overlay in tiles mode. */
  view?: View;
}

const TILE_SIZE = 32;

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
  const showAltMap = view === View.tiles;
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;

  // Memoize derived arrays to give stable references to downstream useMemos
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  const mightyMikeTileValuesArray = useMemo(() => {
    const metadata = isRecord(terrainData._metadata) ? terrainData._metadata : undefined;
    const metadataEntry = metadata && isRecord(metadata[1000]) ? metadata[1000] : undefined;
    const metadataObj = metadataEntry && isRecord(metadataEntry.obj) ? metadataEntry.obj : undefined;
    return metadataObj && isArray(metadataObj.mightyMikeTileValues)
      ? metadataObj.mightyMikeTileValues
      : [];
  }, [terrainData._metadata]);

  // Extract per-tile pixel-accurate collision canvases from the stored tileset
  const collisionImages = useMemo(() => {
    const tilesetRaw = isRecord(terrainData.tileset) ? terrainData.tileset : undefined;
    const raw = tilesetRaw && isArray(tilesetRaw.collisionImages) ? tilesetRaw.collisionImages : [];
    return raw.filter(
      (img): img is HTMLCanvasElement => isRecord(img) && typeof img.getContext === "function",
    );
  }, [terrainData.tileset]);

  /** Extract the flat alt-map data from mightyMikeMapData. */
  const altMapFlat = useMemo<number[]>(() => {
    const metadata = isRecord(terrainData._metadata) ? terrainData._metadata : undefined;
    const metadataEntry = metadata && isRecord(metadata[1000]) ? metadata[1000] : undefined;
    const metadataObj = metadataEntry && isRecord(metadataEntry.obj) ? metadataEntry.obj : undefined;
    const mapData = metadataObj && isRecord(metadataObj.mightyMikeMapData) ? metadataObj.mightyMikeMapData : undefined;
    const altMap2d = mapData && isArray(mapData.altMap) ? mapData.altMap : null;
    if (!altMap2d) return [];
    const flat: number[] = [];
    for (const row of altMap2d) {
      if (isArray(row)) {
        for (const cell of row) {
          flat.push(typeof cell === "number" ? cell : 0);
        }
      }
    }
    return flat;
  }, [terrainData._metadata]);

  // Brush handler: toggle hasCollisionMask for a tile
  const handleBrushTile = useCallback((tileIdx: number) => {
    setTerrainData((data) => {
      const meta = isRecord(data._metadata) && isRecord(data._metadata[1000]) && isRecord(data._metadata[1000].obj)
        ? data._metadata[1000].obj
        : undefined;
      const tileValues = meta && isArray(meta.mightyMikeTileValues) ? meta.mightyMikeTileValues : undefined;
      if (!tileValues || tileIdx < 0 || tileIdx >= tileValues.length) return;
      const tileVal = tileValues[tileIdx];
      if (!isRecord(tileVal)) return;
      tileVal.hasCollisionMask = !tileVal.hasCollisionMask;
    });
  }, [setTerrainData]);

  /** Paint an alt-map value at a tile index. */
  const handleBrushAltMap = useCallback((tileIdx: number) => {
    setTerrainData((data) => {
      const metadata = isRecord(data._metadata) ? data._metadata : undefined;
      const metadataEntry = metadata && isRecord(metadata[1000]) ? metadata[1000] : undefined;
      const metadataObj = metadataEntry && isRecord(metadataEntry.obj) ? metadataEntry.obj : undefined;
      const mapData = metadataObj && isRecord(metadataObj.mightyMikeMapData) ? metadataObj.mightyMikeMapData : undefined;
      if (!mapData) return;
      const altMap2d = isArray(mapData.altMap) ? mapData.altMap : null;
      if (!altMap2d) return;
      const row = Math.floor(tileIdx / mapWidth);
      const col = tileIdx % mapWidth;
      const rowArr = altMap2d[row];
      if (isArray(rowArr) && col < rowArr.length) {
        rowArr[col] = altMapBrushValue;
      }
    });
  }, [setTerrainData, mapWidth, altMapBrushValue]);

  const mapHeight = Math.ceil(layr.length / mapWidth);

  /**
   * Pre-resolve logical tile indices to physical image indices once.
   * This avoids re-doing xlate translation inside the render hot-path.
   */
  const resolvedImageIndices = useMemo<(number | null)[]>(() => {
    return layr.map((logicalTileIndex) => {
      if (logicalTileIndex < 0 || logicalTileIndex >= 2048) return null;
      let imageIndex = logicalTileIndex;
      if (xlatTable && logicalTileIndex < xlatTable.length) {
        const entry = xlatTable[logicalTileIndex];
        if (isRecord(entry) && typeof entry.idx === "number") {
          imageIndex = entry.idx;
        }
      }
      if (imageIndex < 0 || imageIndex >= mapImages.length) return null;
      return imageIndex;
    });
  }, [layr, xlatTable, mapImages.length]);

  /**
   * Performance: pre-bake all tiles into a single background canvas.
   * Renders as one Konva Image node instead of hundreds, drastically reducing
   * hit-graph overhead and draw calls.
   */
  const backgroundCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (mapImages.length === 0 || layr.length === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    layr.forEach((_, i) => {
      const imgIdx = resolvedImageIndices[i];
      if (imgIdx === null) return;
      const img = mapImages[imgIdx];
      if (!img) return;
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;
      ctx.drawImage(img, tx, ty, TILE_SIZE, TILE_SIZE);
    });
    return canvas;
  }, [resolvedImageIndices, mapImages, mapWidth, mapHeight, layr]);

  /**
   * Pre-bake collision overlay: renders a single canvas for all collision tiles.
   * Only recomputed when collision data or mapImages change.
   */
  const collisionCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (!showCollisionOverlay || mightyMikeTileValuesArray.length === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    layr.forEach((_, i) => {
      const tileValue = mightyMikeTileValuesArray[i];
      if (!isRecord(tileValue)) return;
      const hasCollisionMask = getBoolean(tileValue.hasCollisionMask);
      if (!hasCollisionMask) return;

      const imgIdx = resolvedImageIndices[i];
      const usePixelAccurateCollision = getBoolean(tileValue.usePixelAccurateCollision);
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;

      if (usePixelAccurateCollision && imgIdx !== null && imgIdx < collisionImages.length) {
        const collisionImg = collisionImages[imgIdx];
        if (collisionImg) {
          ctx.drawImage(collisionImg, tx, ty, TILE_SIZE, TILE_SIZE);
          return;
        }
      }
      // Tile-based collision: solid blue overlay
      ctx.fillStyle = "rgba(30, 100, 255, 0.35)";
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    });

    return canvas;
  }, [
    showCollisionOverlay,
    mightyMikeTileValuesArray,
    resolvedImageIndices,
    collisionImages,
    layr,
    mapWidth,
    mapHeight,
  ]);

  /**
   * Pre-bake alt-map overlay: one canvas showing directional glyphs per tile.
   * Rebuilt whenever the altMap data or view changes.
   */
  const altMapCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (!showAltMap || altMapFlat.length === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.font = `bold ${Math.floor(TILE_SIZE * 0.55)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    altMapFlat.forEach((val, i) => {
      if (val === 0) return;
      const option = ALT_TILE_OPTIONS.find((o) => o.value === val);
      if (!option) return;
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;
      // Semi-transparent background tint
      ctx.fillStyle = `${option.color}66`;
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
      // Glyph
      ctx.fillStyle = option.color === "transparent" ? "#ffffff" : option.color;
      ctx.fillText(option.glyph, tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
    });

    return canvas;
  }, [showAltMap, altMapFlat, mapWidth, mapHeight]);

  /** Map a Konva Image click/mousemove to a tile index using the stage pointer position. */
  const getTileIndexFromEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): number | null => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return null;
      const col = Math.floor(pos.x / TILE_SIZE);
      const row = Math.floor(pos.y / TILE_SIZE);
      const tileIdx = row * mapWidth + col;
      if (tileIdx < 0 || tileIdx >= layr.length) return null;
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
      } else if (collisionBrushMode) {
        handleBrushTile(tileIdx);
      } else {
        setSelectedTile(tileIdx);
      }
    },
    [showAltMap, collisionBrushMode, getTileIndexFromEvent, handleBrushAltMap, handleBrushTile, setSelectedTile],
  );

  const handleCanvasMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.buttons !== 1) return;
      const tileIdx = getTileIndexFromEvent(e);
      if (tileIdx === null) return;
      if (showAltMap) {
        handleBrushAltMap(tileIdx);
      } else if (collisionBrushMode) {
        handleBrushTile(tileIdx);
      }
    },
    [showAltMap, collisionBrushMode, getTileIndexFromEvent, handleBrushAltMap, handleBrushTile],
  );

  // Selected tile highlight position
  const selX = selectedTile !== null ? (selectedTile % mapWidth) * TILE_SIZE : -1;
  const selY = selectedTile !== null ? Math.floor(selectedTile / mapWidth) * TILE_SIZE : -1;

  if (mapImages.length === 0 || layr.length === 0) {
    return <Layer />;
  }

  return (
    <Layer>
      {/* Single pre-baked background image — far fewer Konva nodes than per-tile rendering */}
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

      {/* Collision overlay: single pre-baked canvas (only rendered when needed) */}
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

      {/* Alt-map overlay: shown in tiles editing mode */}
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

      {/* Selected tile highlight */}
      {!showAltMap && selectedTile !== null && selX >= 0 && selY >= 0 && (
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
