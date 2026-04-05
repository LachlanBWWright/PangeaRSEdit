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
import { AltMapBrushValue, ALT_TILE_OPTIONS } from "../mightymike/MightyMikeAltMapEditor";

// Type guard helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Extract the 2D alt-map array from the nested metadata structure.
 * Returns `null` if no alt-map is present.
 */
function getAltMapArray(metadata: unknown): unknown[] | null {
  if (!isRecord(metadata)) return null;
  const entry = isRecord(metadata[1000]) ? metadata[1000] : null;
  if (!entry) return null;
  const obj = isRecord(entry.obj) ? entry.obj : null;
  if (!obj) return null;
  const mapData = isRecord(obj.mightyMikeMapData) ? obj.mightyMikeMapData : null;
  if (!mapData) return null;
  const altMap = mapData.altMap;
  return isArray(altMap) ? altMap : null;
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
  const showParamsOverlay = useAtomValue(ShowMightyMikeParamsOverlay);
  const paramBrushField = useAtomValue(ParamBrushField);
  const paramBrushValue = useAtomValue(ParamBrushValue);
  const showAltMap = view === View.tiles;
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;

  // Memoize derived arrays to give stable references to downstream useMemos
  const layr = useMemo(
    () => terrainData.Layr?.[1000]?.obj ?? [],
    [terrainData.Layr],
  );
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

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
    const altMap2d = getAltMapArray(terrainData._metadata);
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

  // Tile attributes from tileset for param overlay and param brush
  const tileAttributes = useMemo(() => {
    const tilesetRaw = isRecord(terrainData.tileset) ? terrainData.tileset : undefined;
    const attrs = tilesetRaw && isArray(tilesetRaw.tileAttributes) ? tilesetRaw.tileAttributes : [];
    return attrs.filter(isRecord);
  }, [terrainData.tileset]);

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

  /** Paint a param value at a tile index (using physical/palette tile index). */
  const handleBrushParam = useCallback((tileIdx: number) => {
    if (!paramBrushField) return;
    const physicalIdx = (() => {
      const logical = terrainData.Layr?.[1000]?.obj?.[tileIdx];
      if (logical === undefined) return null;
      const xlt = terrainData.Xlat?.[1000]?.obj;
      if (xlt && logical < xlt.length) {
        const entry = xlt[logical];
        if (isRecord(entry) && typeof entry.idx === "number") return entry.idx;
      }
      return typeof logical === "number" ? logical : null;
    })();
    if (physicalIdx === null) return;

    setTerrainData((data) => {
      const tileset = isRecord(data.tileset) ? data.tileset : undefined;
      const attrs = tileset && isArray(tileset.tileAttributes) ? tileset.tileAttributes : undefined;
      const attr = attrs?.[physicalIdx];
      if (isRecord(attr)) {
        attr[paramBrushField] = paramBrushValue;
      }
      const levelAttr = data.Atrb?.[1000]?.obj?.[physicalIdx];
      if (levelAttr && (paramBrushField === "flags" || paramBrushField === "p0" || paramBrushField === "p1")) {
        levelAttr[paramBrushField] = paramBrushValue;
      }
    });
  }, [paramBrushField, paramBrushValue, terrainData.Layr, terrainData.Xlat, setTerrainData]);

  /** Paint an alt-map value at a tile index. Initializes the alt-map on first use. */
  const handleBrushAltMap = useCallback((tileIdx: number) => {
    setTerrainData((data) => {
      // Lazily initialize the alt-map if it doesn't exist yet
      let altMap2d = getAltMapArray(data._metadata);
      if (!altMap2d) {
        const meta: Record<string, unknown> = isRecord(data._metadata) ? data._metadata : {};
        const entry: Record<string, unknown> = isRecord(meta["1000"]) ? meta["1000"] : { obj: {} };
        const obj: Record<string, unknown> = isRecord(entry["obj"]) ? entry["obj"] : {};
        if (!isRecord(obj["mightyMikeMapData"])) {
          obj["mightyMikeMapData"] = {};
        }
        const mapDataEntry = obj["mightyMikeMapData"];
        if (!isRecord(mapDataEntry)) return;
        // Build empty 2D array sized to the current map
        const w = mapWidth;
        const h = Math.ceil(layr.length / mapWidth);
        const newAltMap: number[][] = Array.from({ length: h }, () => Array<number>(w).fill(0));
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
  }, [setTerrainData, mapWidth, altMapBrushValue, layr.length]);

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
      if (typeof imgIdx !== "number") return;
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
   * Every non-empty tile has inherent collision in Mighty Mike — the pixel-accurate
   * tileset masks (from the colour transparency list) show which pixels per tile are
   * solid.  TILE_PRIORITY_MASK (0x8000) is a rendering-priority flag (tile drawn over
   * sprites), not a collision-only flag.
   */
  const collisionCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (!showCollisionOverlay) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    layr.forEach((rawTileIndex, i) => {
      // tile index 0 is the blank/void tile (no visual, no collision)
      if (rawTileIndex === 0 || rawTileIndex === undefined || rawTileIndex === null) return;

      const imgIdx = resolvedImageIndices[i];
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;

      if (typeof imgIdx === "number" && imgIdx < collisionImages.length) {
        const collisionImg = collisionImages[imgIdx];
        if (collisionImg) {
          ctx.drawImage(collisionImg, tx, ty, TILE_SIZE, TILE_SIZE);
          return;
        }
      }
      // Fallback: solid orange overlay for tiles without a pixel-accurate mask
      ctx.fillStyle = "rgba(200, 120, 0, 0.5)";
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
    });

    return canvas;
  }, [
    showCollisionOverlay,
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
    if (!showAltMap) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.font = `bold ${Math.floor(TILE_SIZE * 0.8)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    altMapFlat.forEach((val, i) => {
      if (val === 0) return;
      const option = ALT_TILE_OPTIONS.find((o) => o.value === val);
      if (!option) return;
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;
      // Semi-transparent dark background so the arrow is always legible
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
      // Fully-opaque glyph in the option colour
      ctx.fillStyle = option.color === "transparent" ? "#ffffff" : option.color;
      ctx.fillText(option.glyph, tx + TILE_SIZE / 2, ty + TILE_SIZE / 2);
    });

    return canvas;
  }, [showAltMap, altMapFlat, mapWidth, mapHeight]);

  /**
   * Pre-bake params overlay: colour-codes tiles that have non-default flags/params.
   */
  const paramsCanvas = useMemo<HTMLCanvasElement | null>(() => {
    if (!showParamsOverlay || tileAttributes.length === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth * TILE_SIZE;
    canvas.height = mapHeight * TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    layr.forEach((rawTileIndex, i) => {
      if (rawTileIndex === 0 || rawTileIndex === undefined || rawTileIndex === null) return;
      const imgIdx = resolvedImageIndices[i];
      if (typeof imgIdx !== "number" || imgIdx >= tileAttributes.length) return;
      const attr = tileAttributes[imgIdx];
      if (!attr) return;
      const flags = typeof attr["flags"] === "number" ? attr["flags"] : 0;
      const p0 = typeof attr["p0"] === "number" ? attr["p0"] : 0;
      const p1 = typeof attr["p1"] === "number" ? attr["p1"] : 0;
      if (flags === 0 && p0 === 0 && p1 === 0) return;
      const tx = (i % mapWidth) * TILE_SIZE;
      const ty = Math.floor(i / mapWidth) * TILE_SIZE;
      if (flags !== 0) {
        ctx.fillStyle = "rgba(220, 50, 50, 0.55)";
        ctx.fillRect(tx, ty, TILE_SIZE / 2, TILE_SIZE / 2);
      }
      if (p0 !== 0) {
        ctx.fillStyle = "rgba(50, 200, 50, 0.55)";
        ctx.fillRect(tx + TILE_SIZE / 2, ty, TILE_SIZE / 2, TILE_SIZE / 2);
      }
      if (p1 !== 0) {
        ctx.fillStyle = "rgba(50, 100, 220, 0.55)";
        ctx.fillRect(tx, ty + TILE_SIZE / 2, TILE_SIZE, TILE_SIZE / 2);
      }
    });

    return canvas;
  }, [showParamsOverlay, tileAttributes, resolvedImageIndices, layr, mapWidth, mapHeight]);

  /** Map a Konva Image click/mousemove to a tile index in the tile grid's coordinate space. */
  const getTileIndexFromEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>): number | null => {
      const stage = e.target.getStage();
      // getRelativePointerPosition accounts for stage scale and translation,
      // returning the pointer position in the stage's local coordinate system.
      const pos = stage?.getRelativePointerPosition();
      if (!pos) return null;
      const col = Math.floor(pos.x / TILE_SIZE);
      const row = Math.floor(pos.y / TILE_SIZE);
      const mapHeight = Math.ceil(layr.length / mapWidth);
      if (col < 0 || row < 0 || col >= mapWidth || row >= mapHeight) return null;
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
    [showAltMap, collisionBrushMode, paramBrushField, getTileIndexFromEvent, handleBrushAltMap, handleBrushTile, handleBrushParam, setSelectedTile],
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
    [showAltMap, collisionBrushMode, paramBrushField, getTileIndexFromEvent, handleBrushAltMap, handleBrushTile, handleBrushParam],
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

      {/* Params overlay: colour-coded indicators for tiles with non-default attributes */}
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

      {/* Selected tile highlight - always shown (even when viewing alt-map) */}
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
