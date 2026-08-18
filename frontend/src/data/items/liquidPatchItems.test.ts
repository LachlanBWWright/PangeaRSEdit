import { describe, expect, it } from "vitest";
import {
  BugdomGlobals,
  NanosaurGlobals,
  Game,
} from "@/data/globals/globals";
import {
  getLiquidPatchCanvas,
  getLiquidPatchDimensions,
  getLiquidPatchStyle,
  isLiquidPatchItem,
} from "./liquidPatchItems";

describe("liquid patch item definitions", () => {
  it("recognizes supported Bugdom and Nanosaur patch types only", () => {
    expect(getLiquidPatchStyle(BugdomGlobals, 14)?.type).toBe("water");
    expect(getLiquidPatchStyle(BugdomGlobals, 999)).toBeNull();
    expect(getLiquidPatchStyle(NanosaurGlobals, 4)?.type).toBe("lava");
    expect(isLiquidPatchItem(NanosaurGlobals, 14)).toBe(true);
    expect(isLiquidPatchItem({ ...BugdomGlobals, GAME_TYPE: Game.OTTO_MATIC }, 14)).toBe(false);
  });

  it("uses Bugdom defaults and coordinate scaling for water offsets", () => {
    const dimensions = getLiquidPatchDimensions(BugdomGlobals, 14, 0, 0, 0, 0);
    expect(dimensions).toEqual({
      width2D: 128,
      depth2D: 128,
      width3D: 640,
      depth3D: 640,
      yValue3D: 3,
      isAbsoluteY: false,
    });
    expect(getLiquidPatchDimensions(BugdomGlobals, 14, 2, 3, 2, 0).yValue3D).toBe(8);
  });

  it("supports indexed Bugdom Y values and clamps table indexes", () => {
    const water = getLiquidPatchDimensions(BugdomGlobals, 14, 1, 1, 1, 4);
    const honey = getLiquidPatchDimensions(BugdomGlobals, 27, 1, 1, 99, 1);
    expect(water).toMatchObject({ yValue3D: 950, isAbsoluteY: true });
    expect(honey).toMatchObject({ yValue3D: 0, isAbsoluteY: true });
  });

  it("uses other Bugdom liquid defaults and indexed values", () => {
    expect(getLiquidPatchDimensions(BugdomGlobals, 27, 1, 1, 0, 0)).toMatchObject({
      yValue3D: 40,
      isAbsoluteY: false,
    });
    expect(getLiquidPatchDimensions(BugdomGlobals, 56, 1, 1, 2, 1)).toMatchObject({
      yValue3D: -230,
      isAbsoluteY: true,
    });
  });

  it("handles Nanosaur lava flags, water placement, and unknown games", () => {
    expect(getLiquidPatchDimensions(NanosaurGlobals, 4, 0, 0, 0, 0)).toMatchObject({
      width3D: 1120,
      yValue3D: 305,
      isAbsoluteY: true,
    });
    expect(getLiquidPatchDimensions(NanosaurGlobals, 4, 0, 0, 0, 5)).toMatchObject({
      width3D: 560,
      yValue3D: 50,
      isAbsoluteY: false,
    });
    expect(getLiquidPatchDimensions(NanosaurGlobals, 14, 0, 0, 0, 1)).toMatchObject({
      yValue3D: 50,
      isAbsoluteY: false,
    });
    expect(getLiquidPatchDimensions(NanosaurGlobals, 14, 0, 0, 0, 0)).toMatchObject({
      yValue3D: 210,
      isAbsoluteY: true,
    });
    expect(getLiquidPatchDimensions({ ...NanosaurGlobals, GAME_TYPE: Game.OTTO_MATIC }, 1, 0, 0, 0, 0)).toEqual({
      width2D: 100,
      depth2D: 100,
      width3D: 400,
      depth3D: 400,
      yValue3D: 0,
      isAbsoluteY: false,
    });
  });

  it("caches canvases by terrain identity and request parameters", () => {
    const first = getLiquidPatchCanvas(BugdomGlobals, null, null, 14, 1, 1, 0, 0, 2, 3);
    const second = getLiquidPatchCanvas(BugdomGlobals, null, null, 14, 1, 1, 0, 0, 2, 3);
    const other = getLiquidPatchCanvas(BugdomGlobals, null, null, 14, 1, 2, 0, 0, 2, 3);
    expect(first).not.toBeNull();
    expect(second?.canvas).toBe(first?.canvas);
    expect(other?.canvas).not.toBe(first?.canvas);
  });
});
