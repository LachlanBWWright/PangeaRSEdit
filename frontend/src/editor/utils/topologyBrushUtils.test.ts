import { describe, expect, it } from "vitest";
import { Game, OttoGlobals } from "@/data/globals/globals";
import {
  TopologyBrushMode,
  TopologyDualEditMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import type { StandardHeader } from "@/python/structSpecs/LevelTypes";
import {
  applyTopologyBrushToSnapshot,
  calculateBrushPixels,
  getTopologyBrushFalloff,
  mergeBrushPixels,
} from "./topologyBrushUtils";

const testHeader: StandardHeader = {
  version: 1,
  numItems: 0,
  mapWidth: 2,
  mapHeight: 2,
  tileSize: 1,
  minY: 0,
  maxY: 0,
  numSplines: 0,
  numFences: 0,
  numTilePages: 0,
  numTiles: 0,
  numUniqueSupertiles: 0,
  numWaterPatches: 0,
  numCheckpoints: 0,
};

describe("topologyBrushUtils", () => {
  it("keeps the smallest distance when merging stroke pixels", () => {
    const mergedPixels = mergeBrushPixels([
      [{ x: 0, y: 0, value: 6, distance: 0.75 }],
      [{ x: 0, y: 0, value: 6, distance: 0.25 }],
    ]);

    expect(mergedPixels).toEqual([
      { x: 0, y: 0, value: 6, distance: 0.25 },
    ]);
  });

  it("applies deltas against the stroke snapshot instead of stacking repeated hits", () => {
    const mergedPixels = mergeBrushPixels([
      [{ x: 0, y: 0, value: -5, distance: 0 }],
      [{ x: 0, y: 0, value: -5, distance: 0.25 }],
    ]);
    const originalFloor = new Array(9).fill(10);
    const result = applyTopologyBrushToSnapshot(
      originalFloor,
      undefined,
      mergedPixels,
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.DELTA_VALUE,
        value: -5,
        header: testHeader,
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.FLOOR,
      TopologyDualEditMode.MIDPOINT,
    );

    expect(originalFloor[0]).toBe(10);
    expect(result.floor[0]).toBe(5);
  });

  it("treats set-value drags as a continuous stroke", () => {
    const pixels = calculateBrushPixels({
      centerX: 2,
      centerY: 0,
      radius: 1,
      brushMode: TopologyBrushMode.CIRCLE_BRUSH,
      valueMode: TopologyValueMode.SET_VALUE,
      value: 100,
      header: testHeader,
      globals: { ...OttoGlobals, GAME_TYPE: Game.OTTO_MATIC },
      tileSize: 1,
      lineStart: { x: 0, y: 0 },
      lineEnd: { x: 2, y: 0 },
    });

    expect(
      pixels.some((pixel) => pixel.x === 1 && pixel.y === 0),
    ).toBe(true);
  });

  it("uses the closest point on a line for square-brush falloff", () => {
    const pixels = calculateBrushPixels({
      centerX: 2,
      centerY: 2,
      radius: 1,
      brushMode: TopologyBrushMode.SQUARE_BRUSH,
      valueMode: TopologyValueMode.DELTA_WITH_DROPOFF,
      value: 10,
      header: testHeader,
      globals: OttoGlobals,
      tileSize: 1,
      lineStart: { x: 0, y: 0 },
      lineEnd: { x: 2, y: 0 },
    });

    expect(pixels).toContainEqual({
      x: 1,
      y: 0,
      value: 10,
      distance: 0,
    });
    expect(pixels.some((pixel) => pixel.x === 1 && pixel.y === 2)).toBe(false);
  });

  it("uses linear dropoff from the closest point on the brush line", () => {
    expect(getTopologyBrushFalloff(0)).toBe(1);
    expect(getTopologyBrushFalloff(0.5)).toBe(0.5);
    expect(getTopologyBrushFalloff(1)).toBe(0);
    expect(getTopologyBrushFalloff(2)).toBe(0);
  });

  it("does not compound samples that affect the same terrain cell", () => {
    const mergedPixels = mergeBrushPixels(
      [[
        { x: 0.1, y: 0.1, value: 10, distance: 0.5 },
        { x: 0.9, y: 0.9, value: 10, distance: 0.25 },
      ]],
      1,
    );
    const result = applyTopologyBrushToSnapshot(
      new Array(9).fill(0),
      undefined,
      mergedPixels,
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.DELTA_WITH_DROPOFF,
        value: 10,
        header: testHeader,
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.FLOOR,
    );

    expect(mergedPixels).toEqual([
      { x: 0.9, y: 0.9, value: 10, distance: 0.25 },
    ]);
    expect(result.floor[0]).toBe(8);
  });
});
