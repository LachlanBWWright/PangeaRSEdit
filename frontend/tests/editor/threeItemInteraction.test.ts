import { describe, expect, it } from "vitest";
import {
  createThreeItemDragState,
  getDraggedItemPlacement,
} from "@/editor/threejs/threeItemInteraction";

describe("threeItemInteraction", () => {
  it("updates X/Z from drag deltas without persisting Y", () => {
    const dragState = createThreeItemDragState(4, 9, 100, 200, 500, 700);
    const placement = getDraggedItemPlacement(dragState, 2, 540, 760);

    expect(placement).toEqual({
      x: 120,
      z: 230,
    });
  });
});
