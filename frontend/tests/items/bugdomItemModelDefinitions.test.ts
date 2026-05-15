import { describe, expect, it } from "vitest";
import { ItemType } from "@/data/items/bugdomItemType";
import { getBugdomSourceDerivedMapping } from "@/data/items/bugdomItemModelDefinitions";

describe("getBugdomSourceDerivedMapping", () => {
  it("keeps lawn vegetation scaled and unlit like the original game", () => {
    const clover = getBugdomSourceDerivedMapping(ItemType.Clover, {
      params: { p0: 1, p1: 0, p2: 0, p3: 0 },
    });
    const weed = getBugdomSourceDerivedMapping(ItemType.Weed, {
      params: { p0: 0, p1: 0, p2: 0, p3: 0 },
    });
    const sunflower = getBugdomSourceDerivedMapping(ItemType.SunFlower, {});
    const cosmo = getBugdomSourceDerivedMapping(ItemType.Cosmo, {});
    const poppy = getBugdomSourceDerivedMapping(ItemType.Poppy, {});

    expect(clover).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 7,
      scale: 0.2,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
    expect(weed).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 2,
      scale: 0.2,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
    expect(sunflower).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 5,
      scale: 0.15,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
    expect(cosmo).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 3,
      scale: 0.4,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
    expect(poppy).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 4,
      scale: 0.4,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
  });

  it("marks lawn grass as unlit while preserving its level-specific variants", () => {
    const lawnGrass = getBugdomSourceDerivedMapping(ItemType.Grass, {
      levelNum: 1,
      params: { p0: 1, p1: 0, p2: 0, p3: 0 },
    });

    expect(lawnGrass).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 1,
      scale: 0.15,
      lightingMode: "unlit",
      verificationStatus: "verified",
    });
  });
});
