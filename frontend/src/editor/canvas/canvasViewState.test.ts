import { describe, expect, it } from "vitest";
import { View } from "@/editor/viewEnum";
import { supportsThreeCanvas } from "./canvasViewState";

describe("supportsThreeCanvas", () => {
  it("allows the world editing menus to use the 3D canvas", () => {
    expect(supportsThreeCanvas(View.items)).toBe(true);
    expect(supportsThreeCanvas(View.splines)).toBe(true);
    expect(supportsThreeCanvas(View.fences)).toBe(true);
    expect(supportsThreeCanvas(View.water)).toBe(true);
    expect(supportsThreeCanvas(View.tiles)).toBe(true);
  });

  it("keeps non-world menus in the 2D canvas", () => {
    expect(supportsThreeCanvas(View.scripts)).toBe(false);
    expect(supportsThreeCanvas(View.supertiles)).toBe(false);
    expect(supportsThreeCanvas(View.vertexColors)).toBe(false);
    expect(supportsThreeCanvas(View.collisionPath)).toBe(false);
  });
});
