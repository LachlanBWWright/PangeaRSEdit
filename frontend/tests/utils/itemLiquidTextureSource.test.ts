import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { getItemLiquidTextureSource } from "@/editor/subviews/items/useItemLiquidTexture";

describe("getItemLiquidTextureSource", () => {
  it("maps the Nanosaur liquid items to their named extracted textures", () => {
    expect(getItemLiquidTextureSource(Game.NANOSAUR, 4)?.url).toContain(
      "nanosaur1/lava.png",
    );
    expect(getItemLiquidTextureSource(Game.NANOSAUR, 14)?.url).toContain(
      "nanosaur1/water.png",
    );
  });

  it("maps Bugdom liquid items to the original numbered texture files", () => {
    const filenames = [14, 27, 55, 56].map((itemType) =>
      getItemLiquidTextureSource(Game.BUGDOM, itemType)?.url.split("/").pop(),
    );
    expect(filenames).toEqual(["128.tga", "200.tga", "201.tga", "202.tga"]);
  });

  it("uses Bugdom's alternate pond water texture on the pond level", () => {
    expect(
      getItemLiquidTextureSource(Game.BUGDOM, 14, 2)?.url.split("/").pop(),
    ).toBe("129.tga");
  });

  it("does not assign textures to ordinary items", () => {
    expect(getItemLiquidTextureSource(Game.NANOSAUR, 2)).toBeNull();
    expect(getItemLiquidTextureSource(Game.BUGDOM, 2)).toBeNull();
  });
});
