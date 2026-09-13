import { describe, expect, it } from "vitest";
import { Game } from "../globals/globals";
import { ItemType as OttoItemType } from "./ottoItemType";
import { itemTypeNames as bugdom2ItemTypeNames } from "./bugdom2ItemType";
import { itemTypeNames as mightyMikeItemTypeNames } from "./mightyMikeItemType";
import { splineItemTypeNames as nanosaur2SplineItemTypeNames } from "../splines/nanosaur2SplineItemType";
import { ITEM_LEVEL_BINDINGS } from "./itemLevelBindings";
import {
  getItemLevelBinding,
  getItemLevelBindings,
  hasItemLevelBinding,
} from "./itemLevelBindings";

describe("item-level bindings", () => {
  it("resolves Otto's level-specific zip-line binding", () => {
    const binding = getItemLevelBinding(
      Game.OTTO_MATIC,
      "terrainItem",
      OttoItemType.ZipLinePost,
    );

    expect(binding?.levelNumbers).toEqual([3, 7]);
    expect(
      hasItemLevelBinding(
        Game.OTTO_MATIC,
        "terrainItem",
        OttoItemType.ZipLinePost,
        3,
      ),
    ).toBe(true);
    expect(
      hasItemLevelBinding(
        Game.OTTO_MATIC,
        "terrainItem",
        OttoItemType.ZipLinePost,
        6,
      ),
    ).toBe(false);
  });

  it("keeps terrain and spline namespaces separate", () => {
    expect(getItemLevelBinding(Game.BUGDOM_2, "terrainItem", 13)?.kind).toBe(
      "terrainItem",
    );
    expect(getItemLevelBinding(Game.BUGDOM_2, "splineItem", 25)?.kind).toBe(
      "splineItem",
    );
  });

  it("restricts Bugdom 2 level-specific models to their source levels", () => {
    expect(hasItemLevelBinding(Game.BUGDOM_2, "terrainItem", 17, 1)).toBe(
      true,
    );
    expect(hasItemLevelBinding(Game.BUGDOM_2, "terrainItem", 17, 2)).toBe(
      false,
    );
  });

  it("restricts other games with level-specific model families", () => {
    expect(hasItemLevelBinding(Game.OTTO_MATIC, "terrainItem", 76, 4)).toBe(
      true,
    );
    expect(hasItemLevelBinding(Game.OTTO_MATIC, "terrainItem", 76, 3)).toBe(
      false,
    );
    expect(hasItemLevelBinding(Game.NANOSAUR_2, "terrainItem", 27, 1)).toBe(
      true,
    );
    expect(hasItemLevelBinding(Game.NANOSAUR_2, "terrainItem", 27, 0)).toBe(
      false,
    );
    expect(hasItemLevelBinding(Game.CRO_MAG, "terrainItem", 24, 5)).toBe(
      true,
    );
    expect(hasItemLevelBinding(Game.CRO_MAG, "terrainItem", 24, 1)).toBe(
      false,
    );
  });

  it("covers every native type in the complete inventory", () => {
    expect(getItemLevelBindings(Game.BUGDOM_2, "terrainItem")).toHaveLength(
      Object.keys(bugdom2ItemTypeNames).length,
    );
    expect(getItemLevelBindings(Game.MIGHTY_MIKE, "mapItem")).toHaveLength(
      Object.keys(mightyMikeItemTypeNames).length,
    );
    expect(getItemLevelBindings(Game.NANOSAUR_2, "splineItem")).toHaveLength(
      Object.keys(nanosaur2SplineItemTypeNames).length,
    );
  });

  it("has one binding per game, namespace, and native type", () => {
    const keys = ITEM_LEVEL_BINDINGS.map(
      (binding) => `${binding.game}:${binding.kind}:${binding.itemType}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
    expect(getItemLevelBinding(Game.MIGHTY_MIKE, "mapItem", 0)?.strategy).toBe(
      "scene-specific-model",
    );
  });

});
