import { describe, expect, it } from "vitest";
import {
  TopologyBrushMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import { OttoGlobals } from "@/data/globals/globals";
import {
  applyTopologyBrushWithTarget,
  calculateBrushPixels,
  brushRadiusToWorldRadius,
  distanceToLineSegment,
  MIN_ROOF_FLOOR_DISTANCE,
} from "./topologyBrushUtils";

describe("topologyBrushUtils line brush math", () => {
  it("computes shortest distance to a segment", () => {
    const distance = distanceToLineSegment(5, 5, 0, 0, 10, 0);
    expect(distance).toBe(5);
  });

  it("converts brush radius to world radius with a minimum of one tile", () => {
    expect(brushRadiusToWorldRadius(1, 40)).toBe(40);
    expect(brushRadiusToWorldRadius(0, 40)).toBe(40);
  });

  it("applies line-based brush extents for adjust-by modes", () => {
    const pixels = calculateBrushPixels({
      centerX: 20,
      centerY: 0,
      radius: 10,
      brushMode: TopologyBrushMode.CIRCLE_BRUSH,
      valueMode: TopologyValueMode.DELTA_VALUE,
      value: 4,
      header: {
        version: 1,
        mapWidth: 64,
        mapHeight: 64,
        tileSize: 1,
        minY: 0,
        maxY: 255,
        numItems: 0,
        numSplines: 0,
        numFences: 0,
        numTilePages: 0,
        numTiles: 0,
        numUniqueSupertiles: 0,
        numWaterPatches: 0,
        numCheckpoints: 0,
      },
      globals: OttoGlobals,
      tileSize: 1,
      lineStart: { x: 0, y: 0 },
      lineEnd: { x: 20, y: 0 },
    });
    const centerlinePoint = pixels.find((pixel) => pixel.x === 10 && pixel.y === 0);
    expect(centerlinePoint).toBeDefined();
    expect(centerlinePoint?.distance).toBe(0);
  });

  it("falls back to radial behavior for set-value mode", () => {
    const pixels = calculateBrushPixels({
      centerX: 10,
      centerY: 10,
      radius: 4,
      brushMode: TopologyBrushMode.SQUARE_BRUSH,
      valueMode: TopologyValueMode.SET_VALUE,
      value: 1,
      header: {
        version: 1,
        mapWidth: 32,
        mapHeight: 32,
        tileSize: 1,
        minY: 0,
        maxY: 255,
        numItems: 0,
        numSplines: 0,
        numFences: 0,
        numTilePages: 0,
        numTiles: 0,
        numUniqueSupertiles: 0,
        numWaterPatches: 0,
        numCheckpoints: 0,
      },
      globals: OttoGlobals,
      tileSize: 1,
      lineStart: { x: 0, y: 0 },
      lineEnd: { x: 40, y: 40 },
    });
    const farPoint = pixels.find((pixel) => pixel.x === 14 && pixel.y === 14);
    expect(farPoint?.distance).toBe(1);
  });

  it("affects at least one tile when brush radius is 1", () => {
    const pixels = calculateBrushPixels({
      centerX: 0,
      centerY: 0,
      radius: 1,
      brushMode: TopologyBrushMode.CIRCLE_BRUSH,
      valueMode: TopologyValueMode.DELTA_VALUE,
      value: 1,
      header: {
        version: 1,
        mapWidth: 8,
        mapHeight: 8,
        tileSize: 1,
        minY: 0,
        maxY: 255,
        numItems: 0,
        numSplines: 0,
        numFences: 0,
        numTilePages: 0,
        numTiles: 0,
        numUniqueSupertiles: 0,
        numWaterPatches: 0,
        numCheckpoints: 0,
      },
      globals: OttoGlobals,
      tileSize: 1,
    });

    expect(pixels.length).toBeGreaterThan(0);
    expect(pixels.some((pixel) => pixel.x === 0 && pixel.y === 0)).toBe(true);
  });

  it("edits the roof only when roof mode is selected", () => {
    const floor = [0, 0, 0, 0];
    const roof = [100, 100, 100, 100];

    applyTopologyBrushWithTarget(
      floor,
      roof,
      [{ x: 0, y: 0, value: 20, distance: 0 }],
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.DELTA_VALUE,
        value: 20,
        header: {
          version: 1,
          mapWidth: 2,
          mapHeight: 2,
          tileSize: 1,
          minY: 0,
          maxY: 255,
          numItems: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.ROOF,
    );

    expect(floor[0]).toBe(0);
    expect(roof[0]).toBe(120);
  });

  it("moves floor and roof together in midpoint mode", () => {
    const floor = [20, 20, 20, 20];
    const roof = [120, 120, 120, 120];

    applyTopologyBrushWithTarget(
      floor,
      roof,
      [{ x: 0, y: 0, value: 30, distance: 0 }],
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.SET_VALUE,
        value: 30,
        header: {
          version: 1,
          mapWidth: 2,
          mapHeight: 2,
          tileSize: 1,
          minY: 0,
          maxY: 255,
          numItems: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.MIDPOINT,
    );

    expect(floor[0]).toBe(-20);
    expect(roof[0]).toBe(80);
  });

  it("keeps the midpoint fixed in difference mode", () => {
    const floor = [20, 20, 20, 20];
    const roof = [120, 120, 120, 120];

    applyTopologyBrushWithTarget(
      floor,
      roof,
      [{ x: 0, y: 0, value: 10, distance: 0 }],
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.SET_VALUE,
        value: 10,
        header: {
          version: 1,
          mapWidth: 2,
          mapHeight: 2,
          tileSize: 1,
          minY: 0,
          maxY: 255,
          numItems: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.DIFFERENCE,
    );

    expect(floor[0]).toBe(60);
    expect(roof[0]).toBe(80);
  });

  it("does not let the floor cross the roof", () => {
    const floor = [20, 20, 20, 20];
    const roof = [50, 50, 50, 50];

    applyTopologyBrushWithTarget(
      floor,
      roof,
      [{ x: 0, y: 0, value: 100, distance: 0 }],
      {
        centerX: 0,
        centerY: 0,
        radius: 1,
        brushMode: TopologyBrushMode.CIRCLE_BRUSH,
        valueMode: TopologyValueMode.SET_VALUE,
        value: 100,
        header: {
          version: 1,
          mapWidth: 2,
          mapHeight: 2,
          tileSize: 1,
          minY: 0,
          maxY: 255,
          numItems: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 0,
          numTiles: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        globals: OttoGlobals,
        tileSize: 1,
      },
      TopologyLayerEditMode.FLOOR,
    );

    expect(floor[0]).toBe(50 - MIN_ROOF_FLOOR_DISTANCE);
  });
});
