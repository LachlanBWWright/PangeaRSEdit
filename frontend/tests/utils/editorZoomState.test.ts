import { describe, expect, it } from "vitest";
import {
  clampZoom,
  getSteppedZoom,
  getWheelZoom,
} from "@/components/editor/editorZoomState";

const bounds = { min: 0.25, max: 16 };

describe("editor zoom state", () => {
  it("clamps zoom to the configured editor bounds", () => {
    expect(clampZoom(0.1, bounds)).toBe(0.25);
    expect(clampZoom(20, bounds)).toBe(16);
  });

  it("uses wheel direction consistently", () => {
    expect(getWheelZoom(1, -1, 1.25, bounds)).toBe(1.25);
    expect(getWheelZoom(1, 1, 1.25, bounds)).toBe(0.8);
    expect(getWheelZoom(1, 0, 1.25, bounds)).toBe(1);
  });

  it("uses the same bounded calculation for zoom buttons", () => {
    expect(getSteppedZoom(1, 1, 1.25, bounds)).toBe(1.25);
    expect(getSteppedZoom(1, -1, 1.25, bounds)).toBe(0.8);
    expect(getSteppedZoom(16, 1, 1.25, bounds)).toBe(16);
  });
});
