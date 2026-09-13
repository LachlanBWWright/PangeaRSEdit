import { describe, expect, it } from "vitest";
import {
  createThreeItemDragState,
  getDraggedItemPlacement,
  getItemDragPlanePoint,
} from "@/editor/threejs/threeItemInteraction";
import {
  createThreeEntityDragState,
  getDraggedEntityPlacement,
} from "@/editor/threejs/threeEntityInteraction";
import { Ray, Vector3 } from "three";

describe("threeItemInteraction", () => {
  it("updates X/Z from drag deltas without persisting Y", () => {
    const dragState = createThreeItemDragState(4, 9, 100, 200, 500, 700);
    const placement = getDraggedItemPlacement(dragState, 2, 540, 760);

    expect(placement).toEqual({
      x: 120,
      z: 230,
    });
  });

  it("anchors a drag to the cursor on the shared ground plane", () => {
    const point = getItemDragPlanePoint(
      new Ray(new Vector3(10, 10, 20), new Vector3(0, -1, 0)),
    );

    expect(point).toEqual({ x: 10, z: 20 });
  });

  it("keeps fence, water, and spline point drags cursor-relative", () => {
    const drag = createThreeEntityDragState(
      "fence",
      2,
      1,
      7,
      100,
      200,
      new Ray(new Vector3(10, 10, 20), new Vector3(0, -1, 0)),
    );
    expect(drag).not.toBeNull();
    if (!drag) return;

    expect(
      getDraggedEntityPlacement(
        drag,
        2,
        new Ray(new Vector3(30, 10, 50), new Vector3(0, -1, 0)),
      ),
    ).toEqual({ x: 110, z: 215 });
  });
});
