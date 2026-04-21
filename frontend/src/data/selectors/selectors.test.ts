import { describe, it, expect, beforeEach } from "vitest";
import {
  selectHeaderData,
  selectItemData,
  selectLiquidData,
  selectFenceData,
  selectSplineData,
  selectItems,
  selectLiquids,
  selectFences,
  selectSplines,
} from "./index";
import { LevelData } from "@/python/structSpecs/LevelTypes";
import {
  ItemData,
  LiquidData,
} from "@/python/structSpecs/LevelTypes";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";
import { ItemType } from "../../data/items/ottoItemType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";
import { FenceType } from "../../data/fences/ottoFenceType";

// Mock level data for testing
const createMockLevelData = (): LevelData => ({
  Hedr: {
    1000: {
      name: "Header",
      obj: {
        version: 1,
        numItems: 2,
        mapWidth: 100,
        mapHeight: 100,
        numTilePages: 1,
        numTiles: 100,
        tileSize: 32,
        minY: 0,
        maxY: 100,
        numSplines: 1,
        numFences: 1,
        numUniqueSupertiles: 10,
        numWaterPatches: 1,
        numCheckpoints: 5,
      },
      order: 0,
    },
  },
  Itms: {
    1000: {
      name: "Terrain Items List",
      obj: [
        {
          x: 10,
          z: 20,
          type: ItemType.BasicPlant,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        },
        {
          x: 30,
          z: 40,
          type: ItemType.SpacePodGenerator,
          flags: 1,
          p0: 1,
          p1: 1,
          p2: 1,
          p3: 1,
        },
      ],
      order: 1,
    },
  },
  Liqd: {
    1000: {
      name: "Water List",
      obj: [
        {
          type: WaterBodyType.BLUEWATER,
          flags: 0,
          height: 10,
          numNubs: 4,
          reserved: 0,
          nubs: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
          ],
          hotSpotX: 5,
          hotSpotZ: 5,
          bBoxTop: 10,
          bBoxLeft: 0,
          bBoxBottom: 0,
          bBoxRight: 10,
        },
      ],
      order: 2,
    },
  },
  Fenc: {
    1000: {
      name: "Fence List",
      obj: [
        {
          fenceType: FenceType.FARMWOOD,
          numNubs: 2,
          junkNubListPtr: 0,
          bbTop: 10,
          bbBottom: 0,
          bbLeft: 0,
          bbRight: 10,
        },
      ],
      order: 3,
    },
  },
  FnNb: {
    1000: {
      name: "Fence Nub List",
      obj: [
        [0, 0],
        [10, 10],
      ],
      order: 4,
    },
  },
  Spln: {
    1000: {
      name: "Spline List",
      obj: [
        {
          numNubs: 3,
          numPoints: 10,
          numItems: 1,
          bbTop: 20,
          bbLeft: 0,
          bbBottom: 0,
          bbRight: 20,
        },
      ],
      order: 5,
    },
  },
  SpNb: {
    1000: {
      name: "Spline Nub List",
      obj: [
        { x: 0, z: 0 },
        { x: 10, z: 10 },
        { x: 20, z: 0 },
      ],
      order: 6,
    },
  },
  SpPt: {
    1000: {
      name: "Spline Point List",
      obj: Array(10)
        .fill(0)
        .map((_, i) => ({ x: i * 2, z: Math.sin(i) * 5 })),
      order: 7,
    },
  },
  SpIt: {
    1000: {
      name: "Spline Item List",
      obj: [
        {
          type: SplineItemType.Human,
          placement: 0.5,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        },
      ],
      order: 8,
    },
  },
  // Required fields for the interface
  Atrb: {
    1000: {
      name: "Tile Attribute Data",
      obj: [],
      order: 9,
    },
  },
  Timg: {
    1000: {
      name: "Extracted Tile Image Data 32x32/16bit",
      data: "",
      order: 10,
    },
  },
  ItCo: {
    1000: {
      name: "Terrain Items Color Array",
      data: "",
      order: 11,
    },
  },
  Layr: {
    1000: {
      name: "Terrain Layer Matrix",
      obj: [],
      order: 12,
    },
  },
  STgd: {
    1000: {
      name: "SuperTile Grid",
      obj: [],
      order: 13,
    },
  },
  YCrd: {
    1000: {
      name: "Floor&Ceiling Y Coords",
      obj: [],
      order: 14,
    },
  },
  alis: {},
  _metadata: {
    file_attributes: 0,
    junk1: 0,
    junk2: 0,
  },
});

describe("Data Selectors", () => {
  let mockData: LevelData;

  function assertIsLevel(x: unknown): asserts x is LevelData {
    if (typeof x !== 'object' || x === null || !('Hedr' in x)) {
      expect.fail('Value is not a LevelData');
    }
  }

  function assertIsItemData(x: unknown): asserts x is ItemData {
    if (typeof x !== 'object' || x === null || !('Itms' in x)) {
      expect.fail('Value is not ItemData');
    }
  }

  function assertIsLiquidData(x: unknown): asserts x is LiquidData {
    if (typeof x !== 'object' || x === null || !('Liqd' in x)) {
      expect.fail('Value is not LiquidData');
    }
  }

  beforeEach(() => {
    mockData = createMockLevelData();
  });

  describe("Header Data Selectors", () => {
    it("should select header data correctly", () => {
      const headerData = selectHeaderData(mockData);
      expect(headerData).toBeTruthy();
      if (!headerData) expect.fail("header data missing");
      const hed = headerData.Hedr[1000];
      if (!hed) expect.fail("missing Hedr[1000]");
      expect(hed.obj.version).toBe(1);
      expect(hed.obj.numItems).toBe(2);
    });

    it("should return null when no header data exists", () => {
      const emptyDataUnknown: unknown = {
        ...mockData,
        Hedr: undefined,
      };
      assertIsLevel(emptyDataUnknown);
      const headerData = selectHeaderData(emptyDataUnknown);
      expect(headerData).toBeNull();
    });
  });

  describe("Item Data Selectors", () => {
    it("should select item data correctly", () => {
      assertIsItemData(mockData);
      const itemData = selectItemData(mockData);
      expect(itemData).toBeTruthy();
      if (!itemData) expect.fail("item data missing");
      const itmsEntry = itemData.Itms[1000];
      if (!itmsEntry) expect.fail("missing Itms[1000]");
      expect(itmsEntry.obj).toHaveLength(2);
    });

    it("should select items array correctly", () => {
      assertIsItemData(mockData);
      const items = selectItems(mockData);
      expect(items).toHaveLength(2);
      if (items.length < 2) expect.fail("items missing");
      const [firstItem, secondItem] = items;
      if (!firstItem || !secondItem) expect.fail("items entries missing");
      expect(firstItem.type).toBe(ItemType.BasicPlant);
      expect(secondItem.type).toBe(ItemType.SpacePodGenerator);
    });

    it("should return empty array when no items exist", () => {
      const emptyDataUnknown: unknown = { ...mockData, Itms: undefined };
      assertIsItemData(emptyDataUnknown);
      const items = selectItems(emptyDataUnknown);
      expect(items).toEqual([]);
    });
  });

  describe("Liquid Data Selectors", () => {
    it("should select liquid data correctly", () => {
      assertIsLiquidData(mockData);
      const liquidData = selectLiquidData(mockData);
      expect(liquidData).toBeTruthy();
      if (!liquidData) expect.fail("liquid data missing");
      const liqdEntry = liquidData.Liqd[1000];
      if (!liqdEntry) expect.fail("missing Liqd[1000]");
      expect(liqdEntry.obj).toHaveLength(1);
    });

    it("should select liquids array correctly", () => {
      assertIsLiquidData(mockData);
      const liquids = selectLiquids(mockData);
      expect(liquids).toHaveLength(1);
      if (liquids.length < 1) expect.fail("liquids missing");
      const [firstLiquid] = liquids;
      if (!firstLiquid) expect.fail("liquid entry missing");
      expect(firstLiquid.type).toBe(WaterBodyType.BLUEWATER);
    });
  });

  describe("Fence Data Selectors", () => {
    it("should select fence data correctly", () => {
      const fenceData = selectFenceData(mockData);
      expect(fenceData).toBeTruthy();
      if (!fenceData) expect.fail("fence data missing");
      const fencEntry = fenceData.Fenc[1000];
      if (!fencEntry) expect.fail("missing Fenc[1000]");
      const fnnbEntry = fenceData.FnNb[1000];
      if (!fnnbEntry) expect.fail("missing FnNb[1000]");
      expect(fencEntry.obj).toHaveLength(1);
      expect(fnnbEntry.obj).toHaveLength(2);
    });

    it("should select fences array correctly", () => {
      const fences = selectFences(mockData);
      expect(fences).toHaveLength(1);
      if (fences.length < 1) expect.fail("fences missing");
      const [firstFence] = fences;
      if (!firstFence) expect.fail("fence entry missing");
      expect(firstFence.fenceType).toBe(FenceType.FARMWOOD);
    });
  });

  describe("Spline Data Selectors", () => {
    it("should select spline data correctly", () => {
      const splineData = selectSplineData(mockData);
      expect(splineData).toBeTruthy();
      if (!splineData) expect.fail("spline data missing");
      const splnEntry = splineData.Spln[1000];
      if (!splnEntry) expect.fail("missing Spln[1000]");
      const spnbEntry = splineData.SpNb[1000];
      if (!spnbEntry) expect.fail("missing SpNb[1000]");
      const spptEntry = splineData.SpPt[1000];
      if (!spptEntry) expect.fail("missing SpPt[1000]");
      const spitEntry = splineData.SpIt[1000];
      if (!spitEntry) expect.fail("missing SpIt[1000]");
      expect(splnEntry.obj).toHaveLength(1);
      expect(spnbEntry.obj).toHaveLength(3);
      expect(spptEntry.obj).toHaveLength(10);
      expect(spitEntry.obj).toHaveLength(1);
    });

    it("should select splines array correctly", () => {
      const splines = selectSplines(mockData);
      expect(splines).toHaveLength(1);
      if (splines.length < 1) expect.fail("splines missing");
      const [firstSpline] = splines;
      if (!firstSpline) expect.fail("spline entry missing");
      expect(firstSpline.numNubs).toBe(3);
    });
  });
});
