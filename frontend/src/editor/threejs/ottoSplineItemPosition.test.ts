import { describe, expect, it } from "vitest";
import { Group, Mesh, BoxGeometry } from "three";
import { Game } from "@/data/globals/globals";
import { ItemType } from "@/data/items/ottoItemType";
import {
  getOttoSplineItemModelY,
  getOttoSpinningPlatformY,
  getOttoSplineItemTerrainOffset,
  getSplineItemModelY,
} from "./ottoSplineItemPosition";

describe("Spline item vertical placement", () => {
  it("preserves the source's elevated moving-platform and clown-fish offsets", () => {
    expect(getOttoSplineItemTerrainOffset(ItemType.MovingPlatform)).toBe(500);
    expect(getOttoSplineItemTerrainOffset(ItemType.Clownfish)).toBe(700);
    expect(getOttoSplineItemTerrainOffset(ItemType.Enemy_BrainAlien)).toBe(0);
  });

  it("preserves the source's 550-unit spinning-platform base height", () => {
    expect(getOttoSpinningPlatformY(100, 0)).toBe(650);
    expect(getOttoSpinningPlatformY(100, 3)).toBe(680);
  });

  it("anchors the transformed model bottom at the source height", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(10, 20, 10));
    mesh.position.y = -40;
    model.add(mesh);
    model.position.y = 30;

    expect(getOttoSplineItemModelY(100, ItemType.Enemy_BrainAlien, model)).toBe(150);
  });

  it("applies source terrain-relative offsets for the other games", () => {
    const model = new Group();
    const mesh = new Mesh(new BoxGeometry(10, 20, 10));
    model.add(mesh);

    expect(getSplineItemModelY(Game.BUGDOM, 100, 3, model)).toBe(220);
    expect(getSplineItemModelY(Game.BUGDOM_2, 100, 58, model)).toBe(130);
    expect(getSplineItemModelY(Game.CRO_MAG, 100, 58, model)).toBe(4110);
    expect(getSplineItemModelY(Game.BILLY_FRONTIER, 100, 31, model)).toBe(165);
    expect(getSplineItemModelY(Game.NANOSAUR_2, 100, 15, model)).toBe(110);
  });
});
