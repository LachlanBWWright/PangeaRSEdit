import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { getLiquidTextureSource } from "@/editor/subviews/water/useGameLiquidTexture";

describe("getLiquidTextureSource", () => {
  it("maps every Otto Matic liquid type to its original global sprite", () => {
    const filenames = Array.from({ length: 8 }, (_, type) =>
      getLiquidTextureSource(Game.OTTO_MATIC, type)?.url.split("/").pop(),
    );

    expect(filenames).toEqual([
      "global002.tga",
      "global003.tga",
      "global004.tga",
      "global005.tga",
      "global006.tga",
      "global007.tga",
      "global008.tga",
      "global009.tga",
    ]);
  });

  it("uses the game's water, pool, and garbage sprites for Bugdom 2", () => {
    const filenames = [0, 1, 2].map((type) =>
      getLiquidTextureSource(Game.BUGDOM_2, type)?.url.split("/").pop(),
    );

    expect(filenames).toEqual(["006.tga", "007.tga", "008.tga"]);
  });

  it("maps all Nanosaur 2 lava variants to the shared lava sprite", () => {
    expect(
      getLiquidTextureSource(Game.NANOSAUR_2, 0)?.url.endsWith("global005.png"),
    ).toBe(true);
    expect(
      getLiquidTextureSource(Game.NANOSAUR_2, 1)?.url.endsWith("global006.png"),
    ).toBe(true);
    expect(
      getLiquidTextureSource(Game.NANOSAUR_2, 9)?.url.endsWith("global007.jpg"),
    ).toBe(true);
  });

  it("uses all three Billy Frontier water sprites", () => {
    const filenames = [0, 1, 2].map((type) =>
      getLiquidTextureSource(Game.BILLY_FRONTIER, type)?.url.split("/").pop(),
    );

    expect(filenames).toEqual([
      "global001.png",
      "global002.png",
      "global003.png",
    ]);
  });

  it("loads Cro-Mag water from the embedded global model material", () => {
    const source = getLiquidTextureSource(Game.CRO_MAG, 0);

    expect(source?.format).toBe("bg3d");
    expect(source?.materialIndex).toBe(13);
    expect(source?.url.endsWith("global.bg3d")).toBe(true);
  });
});
