import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import { getItemModelCacheKey } from "@/editor/threejs/hooks/itemModelCacheKey";
import { bugdomItemMapper } from "@/data/items/mappers/bugdomItemMapper";
import { bugdom2ItemMapper } from "@/data/items/mappers/bugdom2ItemMapper";
import { croMagItemMapper } from "@/data/items/mappers/croMagItemMapper";
import { nanosaur1ItemMapper } from "@/data/items/mappers/nanosaur1ItemMapper";
import { nanosaur2ItemMapper } from "@/data/items/mappers/nanosaur2ItemMapper";
import { ottoItemMapper } from "@/data/items/mappers/ottoItemMapper";
import { billyFrontierItemMapper } from "@/data/items/mappers/billyFrontierItemMapper";
import { ItemType as BugdomItemType } from "@/data/items/bugdomItemType";
import { ItemType as Bugdom2ItemType } from "@/data/items/bugdom2ItemType";
import { ItemType as CroMagItemType } from "@/data/items/croMagItemType";
import { ItemType as NanosaurItemType } from "@/data/items/nanosaurItemType";
import { ItemType as Nanosaur2ItemType } from "@/data/items/nanosaur2ItemType";
import { ItemType as OttoItemType } from "@/data/items/ottoItemType";
import { ItemType as BillyItemType } from "@/data/items/billyFrontierItemType";

describe("item model mappings", () => {
  it("includes both level and param state in the Bugdom 2 door cache key", () => {
    expect(
      getItemModelCacheKey(
        Game.BUGDOM_2,
        Bugdom2ItemType.Door,
        { p0: 0, p1: 2, p2: 0, p3: 0 },
        4,
      ),
    ).toBe(`g${Game.BUGDOM_2}_${Bugdom2ItemType.Door}_lv4_p1_2`);
  });

  it("maps Bugdom 2 closet doors to silicon and diary meshes with source scales", () => {
    const siliconDoor = bugdom2ItemMapper.getMapping(
      Bugdom2ItemType.Door,
      4,
      { p0: 0, p1: 0, p2: 0, p3: 0 },
    );
    const diaryDoor = bugdom2ItemMapper.getMapping(
      Bugdom2ItemType.Door,
      4,
      { p0: 0, p1: 1, p2: 0, p3: 0 },
    );

    expect(siliconDoor).toMatchObject({
      modelFile: "Level6_Closet.bg3d",
      modelIndex: 21,
      scale: 0.5,
    });
    expect(diaryDoor).toMatchObject({
      modelFile: "Level6_Closet.bg3d",
      modelIndex: 19,
      scale: 6.0,
    });
    expect(bugdom2ItemMapper.isLevelDependent(Bugdom2ItemType.Door)).toBe(true);
    expect(bugdom2ItemMapper.isParamDependent(Bugdom2ItemType.Door)).toBe(true);
  });

  it("maps Bugdom 2 park doors from the level-specific base index", () => {
    const parkDoor = bugdom2ItemMapper.getMapping(
      Bugdom2ItemType.Door,
      8,
      { p0: 0, p1: 2, p2: 0, p3: 0 },
    );

    expect(parkDoor).toMatchObject({
      modelFile: "Level10_Park.bg3d",
      modelIndex: 16,
      scale: 1.8,
    });
  });

  it("maps Bugdom grass from the correct level model set", () => {
    const lawnGrass = bugdomItemMapper.getMapping(
      BugdomItemType.Grass,
      1,
      { p0: 1, p1: 0, p2: 0, p3: 0 },
    );
    const forestGrass = bugdomItemMapper.getMapping(
      BugdomItemType.Grass,
      3,
      { p0: 1, p1: 0, p2: 0, p3: 0 },
    );
    const nightGrass = bugdomItemMapper.getMapping(
      BugdomItemType.Grass,
      5,
      { p0: 1, p1: 0, p2: 0, p3: 0 },
    );

    expect(lawnGrass).toMatchObject({
      modelFile: "Lawn_Models2.3dmf",
      modelIndex: 1,
      scale: 0.15,
      verificationStatus: "verified",
    });
    expect(forestGrass).toMatchObject({
      modelFile: "Forest_Models.3dmf",
      modelIndex: 3,
      scale: 0.15,
      verificationStatus: "verified",
    });
    expect(nightGrass).toMatchObject({
      modelFile: "Night_Models.3dmf",
      modelIndex: 10,
      scale: 0.15,
      verificationStatus: "verified",
    });
    expect(bugdomItemMapper.isLevelDependent(BugdomItemType.Grass)).toBe(true);
    expect(bugdomItemMapper.isParamDependent(BugdomItemType.Grass)).toBe(true);
  });

  it("maps Bugdom pond flora variants from parm[0]", () => {
    const pondGrass = bugdomItemMapper.getMapping(
      BugdomItemType.PondGrass,
      2,
      { p0: 2, p1: 0, p2: 0, p3: 0 },
    );
    const reed = bugdomItemMapper.getMapping(
      BugdomItemType.Reed,
      2,
      { p0: 1, p1: 0, p2: 0, p3: 0 },
    );

    expect(pondGrass).toMatchObject({
      modelFile: "Pond_Models.3dmf",
      modelIndex: 6,
      verificationStatus: "verified",
    });
    expect(reed).toMatchObject({
      modelFile: "Pond_Models.3dmf",
      modelIndex: 8,
      scale: 0.4,
      verificationStatus: "verified",
    });
    expect(bugdomItemMapper.isParamDependent(BugdomItemType.PondGrass)).toBe(true);
    expect(bugdomItemMapper.isParamDependent(BugdomItemType.Reed)).toBe(true);
  });

  it("maps Bugdom 1 forest tree, checkpoint, rolling boulder, and omits rock ledges", () => {
    expect(
      bugdomItemMapper.getMapping(BugdomItemType.Tree, 3, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Forest_Models.3dmf",
      modelIndex: 1,
      scale: 20,
    });

    expect(
      bugdomItemMapper.getMapping(BugdomItemType.Checkpoint, 1, {
        p0: 2,
        p1: 1,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Global_Models1.3dmf",
      modelIndex: 7,
      scale: 1.5,
    });

    expect(
      bugdomItemMapper.getMapping(BugdomItemType.RollingBoulder, 3, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Global_Models1.3dmf",
      modelIndex: 6,
      scale: 3,
    });

    expect(
      bugdomItemMapper.getMapping(BugdomItemType.RockLedge, 3, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toBeUndefined();
  });

  it("maps Bugdom 2 source-driven variants and suppresses target-only moths", () => {
    expect(
      bugdom2ItemMapper.getMapping(Bugdom2ItemType.POW, 2, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Level4_Plumbing.bg3d",
      modelIndex: 2,
      scale: 1.6,
    });

    expect(
      bugdom2ItemMapper.getMapping(Bugdom2ItemType.POW, 4, {
        p0: 2,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Level6_Closet.bg3d",
      modelIndex: 26,
      scale: 3,
    });

    expect(
      bugdom2ItemMapper.getMapping(Bugdom2ItemType.SiliconPart, 4, {
        p0: 2,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Level6_Closet.bg3d",
      modelIndex: 24,
    });

    expect(
      bugdom2ItemMapper.getMapping(
        Bugdom2ItemType.SquishBerry,
        1,
        { p0: 0, p1: 0, p2: 0, p3: 0 },
        1,
      ),
    ).toMatchObject({
      modelFile: "Level2_Sidewalk.bg3d",
      modelIndex: 26,
    });

    expect(
      bugdom2ItemMapper.getMapping(Bugdom2ItemType.Enemy_Moth, 4, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 1,
      }),
    ).toBeUndefined();
  });

  it("maps Cro-Mag track-specific items from the active track", () => {
    expect(
      croMagItemMapper.getMapping(CroMagItemType.Tree, 8, {
        p0: 1,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "europe.bg3d",
      modelIndex: 12,
    });

    expect(
      croMagItemMapper.getMapping(CroMagItemType.House, 9, {
        p0: 2,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "scandinavia.bg3d",
      modelIndex: 11,
    });

    expect(
      croMagItemMapper.getMapping(CroMagItemType.CampFire, 9, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "scandinavia.bg3d",
      modelIndex: 18,
    });
  });

  it("maps Nanosaur 1 parameterized pickups and terrain patches", () => {
    expect(
      nanosaur1ItemMapper.getMapping(NanosaurItemType.PowerUp, 0, {
        p0: 6,
        p1: 1,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Global_Models.3dmf",
      modelIndex: 18,
    });

    expect(
      nanosaur1ItemMapper.getMapping(NanosaurItemType.Tree, 0, {
        p0: 5,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Level1_Models.3dmf",
      modelIndex: 21,
    });

    expect(
      nanosaur1ItemMapper.getMapping(NanosaurItemType.LavaPatch, 0, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "Level1_Models.3dmf",
      modelIndex: 1,
      scale: 2,
    });
  });

  it("omits Nanosaur 2 terrain Ramphor and keeps Otto/Billy source-first mappings", () => {
    expect(
      nanosaur2ItemMapper.getMapping(Nanosaur2ItemType.RamphorEnemy, 0, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toBeUndefined();

    expect(
      ottoItemMapper.getMapping(OttoItemType.BasicPlant, 0, {
        p0: 8,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "level7_fireice.bg3d",
      modelIndex: 53,
      scale: 2,
    });

    expect(
      ottoItemMapper.getMapping(OttoItemType.SpacePodGenerator, 0, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toBeUndefined();

    expect(
      ottoItemMapper.getMapping(OttoItemType.BumperCar, 0, {
        p0: 1,
        p1: 2,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "level5_cloud.bg3d",
      modelIndex: 11,
    });

    expect(
      billyFrontierItemMapper.getMapping(BillyItemType.ShootoutSaloon, 0, {
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      }),
    ).toMatchObject({
      modelFile: "buildings.bg3d",
      modelIndex: 0,
    });
  });
});
