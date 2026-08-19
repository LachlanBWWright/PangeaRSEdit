import { describe, expect, it } from "vitest";
import {
  parseEventIntegerInput,
  parseEventTimeInput,
  updateAnimationEvent,
} from "@/components/AnimationViewer/animationEventEditorState";
import {
  deriveBrushColorFromRgbChannel,
  getPaletteCommitState,
  getPaletteEditorState,
  getPaletteSwatchColor,
} from "@/components/ImageEditor/imageToolsPanelState";

describe("animation event editor state", () => {
  it("applies event patches without mutating the source", () => {
    const source = { time: 10, type: 2, value: 3 };
    const updated = updateAnimationEvent(source, { time: 14, value: 9 });
    expect(updated).toEqual({ time: 14, type: 2, value: 9 });
    expect(source).toEqual({ time: 10, type: 2, value: 3 });
  });

  it.each([
    ["", null],
    ["   ", null],
    ["invalid", null],
    ["-1", null],
    ["1.6", 2],
    ["0", 0],
  ])("parses event time %j", (input, expected) => {
    expect(parseEventTimeInput(input)).toBe(expected);
  });

  it.each([
    ["", null],
    ["invalid", null],
    ["12", 12],
    ["-4", -4],
    ["9.8", 9],
  ])("parses integer input %j", (input, expected) => {
    expect(parseEventIntegerInput(input)).toBe(expected);
  });
});

describe("image tools panel state", () => {
  it("updates and clamps individual RGB channels", () => {
    expect(deriveBrushColorFromRgbChannel({ r: 10, g: 20, b: 30 }, "r", 300)).toBe("#ff141e");
    expect(deriveBrushColorFromRgbChannel({ r: 10, g: 20, b: 30 }, "g", -5)).toBe("#0a001e");
    expect(deriveBrushColorFromRgbChannel({ r: 10, g: 20, b: 30 }, "b", 128)).toBe("#0a1480");
  });

  it("only creates palette editor state for editable existing colors", () => {
    expect(getPaletteEditorState(undefined, true, 0)).toBeNull();
    expect(getPaletteEditorState(["#000000"], false, 0)).toBeNull();
    expect(getPaletteEditorState(["#000000"], true, 2)).toBeNull();
    expect(getPaletteEditorState(["#000000"], true, 0)).toEqual({ index: 0, color: "#000000" });
  });

  it("only creates commits for actual edits", () => {
    expect(getPaletteCommitState(null, "#ffffff", "#000000")).toBeNull();
    expect(getPaletteCommitState(1, "", "#000000")).toBeNull();
    expect(getPaletteCommitState(1, "#000000", "#000000")).toBeNull();
    expect(getPaletteCommitState(1, "#ffffff", "#000000")).toEqual({
      index: 1,
      nextColor: "#ffffff",
      originalColor: "#000000",
    });
  });

  it("reads optional swatches safely", () => {
    expect(getPaletteSwatchColor(["#123456"], 0)).toBe("#123456");
    expect(getPaletteSwatchColor(undefined, 0)).toBeNull();
    expect(getPaletteSwatchColor([], 1)).toBeNull();
  });
});
