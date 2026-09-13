import { describe, expect, it } from "vitest";
import { Game } from "../globals/globals";
import { getItemLevelSupportLabel } from "./itemLevelSupport";

describe("getItemLevelSupportLabel", () => {
  it("labels a registered item as supported for its level", () => {
    expect(
      getItemLevelSupportLabel(Game.OTTO_MATIC, "terrainItem", 58, 3),
    ).toBe("Supported level");
  });

  it("labels a registered item as unsupported outside its levels", () => {
    expect(
      getItemLevelSupportLabel(Game.OTTO_MATIC, "terrainItem", 58, 4),
    ).toBe("Unsupported level");
  });

  it("uses the Otto model bundle for level-specific items", () => {
    expect(
      getItemLevelSupportLabel(Game.OTTO_MATIC, "terrainItem", 28, 0),
    ).toBe("Unsupported level");
    expect(
      getItemLevelSupportLabel(Game.OTTO_MATIC, "terrainItem", 28, 1),
    ).toBe("Supported level");
  });

  it("labels an item as unsupported when the level is not known", () => {
    expect(
      getItemLevelSupportLabel(Game.BUGDOM, "splineItem", 0, undefined),
    ).toBe("Unsupported level");
  });
});
