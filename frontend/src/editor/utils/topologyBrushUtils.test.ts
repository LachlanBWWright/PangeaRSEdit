import { describe, expect, it } from "vitest";
import { TopologyBrushMode, TopologyValueMode } from "@/data/tiles/tileAtoms";
import { OttoGlobals } from "@/data/globals/globals";
import {
  calculateBrushPixels,
  distanceToLineSegment,
} from "./topologyBrushUtils";

describe("topologyBrushUtils line brush math", () => {
  it("computes shortest distance to a segment", () => {
    const distance = distanceToLineSegment(5, 5, 0, 0, 10, 0);
    expect(distance).toBe(5);
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
});
