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
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import {
  ItemData,
  LiquidData,
} from "../../python/structSpecs/ottoMaticLevelData";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";
import { ItemType } from "../../data/items/ottoItemType";
import { WaterBodyType } from "../../data/water/ottoWaterBodyType";
import { FenceType } from "../../data/fences/ottoFenceType";

// Mock level data for testing
const createMockLevelData = (): ottoMaticLevel => ({
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
  let mockData: ottoMaticLevel;

  beforeEach(() => {
    mockData = createMockLevelData();
  });

  describe("Header Data Selectors", () => {
    it("should select header data correctly", () => {
      const headerData = selectHeaderData(mockData);
      expect(headerData).toBeTruthy();
      if (!headerData) throw new Error("header data missing");
      const hed = headerData.Hedr[1000];
      if (!hed) throw new Error("missing Hedr[1000]");
      expect(hed.obj.version).toBe(1);
      expect(hed.obj.numItems).toBe(2);
    });

    it("should return null when no header data exists", () => {
      const emptyData = {
        ...mockData,
        Hedr: undefined,
      } as unknown as ottoMaticLevel;
      const headerData = selectHeaderData(emptyData);
      expect(headerData).toBeNull();
    });
  });

  describe("Item Data Selectors", () => {
    it("should select item data correctly", () => {
      const itemData = selectItemData(mockData as ItemData);
      expect(itemData).toBeTruthy();
      if (!itemData) throw new Error("item data missing");
      const itmsEntry = itemData.Itms[1000];
      if (!itmsEntry) throw new Error("missing Itms[1000]");
      expect(itmsEntry.obj).toHaveLength(2);
    });

    it("should select items array correctly", () => {
      const items = selectItems(mockData as ItemData);
      expect(items).toHaveLength(2);
      if (items.length < 2) throw new Error("items missing");
      const [firstItem, secondItem] = items;
      if (!firstItem || !secondItem) throw new Error("items entries missing");
      expect(firstItem.type).toBe(ItemType.BasicPlant);
      expect(secondItem.type).toBe(ItemType.SpacePodGenerator);
    });

    it("should return empty array when no items exist", () => {
      const emptyData = { ...mockData, Itms: undefined } as unknown as ItemData;
      const items = selectItems(emptyData);
      expect(items).toEqual([]);
    });
  });

  describe("Liquid Data Selectors", () => {
    it("should select liquid data correctly", () => {
      const liquidData = selectLiquidData(mockData as LiquidData);
      expect(liquidData).toBeTruthy();
      if (!liquidData) throw new Error("liquid data missing");
      const liqdEntry = liquidData.Liqd[1000];
      if (!liqdEntry) throw new Error("missing Liqd[1000]");
      expect(liqdEntry.obj).toHaveLength(1);
    });

    it("should select liquids array correctly", () => {
      const liquids = selectLiquids(mockData as LiquidData);
      expect(liquids).toHaveLength(1);
      if (liquids.length < 1) throw new Error("liquids missing");
      const [firstLiquid] = liquids;
      if (!firstLiquid) throw new Error("liquid entry missing");
      expect(firstLiquid.type).toBe(WaterBodyType.BLUEWATER);
    });
  });

  describe("Fence Data Selectors", () => {
    it("should select fence data correctly", () => {
      const fenceData = selectFenceData(mockData);
      expect(fenceData).toBeTruthy();
      if (!fenceData) throw new Error("fence data missing");
      const fencEntry = fenceData.Fenc[1000];
      if (!fencEntry) throw new Error("missing Fenc[1000]");
      const fnnbEntry = fenceData.FnNb[1000];
      if (!fnnbEntry) throw new Error("missing FnNb[1000]");
      expect(fencEntry.obj).toHaveLength(1);
      expect(fnnbEntry.obj).toHaveLength(2);
    });

    it("should select fences array correctly", () => {
      const fences = selectFences(mockData);
      expect(fences).toHaveLength(1);
      if (fences.length < 1) throw new Error("fences missing");
      const [firstFence] = fences;
      if (!firstFence) throw new Error("fence entry missing");
      expect(firstFence.fenceType).toBe(FenceType.FARMWOOD);
    });
  });

  describe("Spline Data Selectors", () => {
    it("should select spline data correctly", () => {
      const splineData = selectSplineData(mockData);
      expect(splineData).toBeTruthy();
      if (!splineData) throw new Error("spline data missing");
      const splnEntry = splineData.Spln[1000];
      if (!splnEntry) throw new Error("missing Spln[1000]");
      const spnbEntry = splineData.SpNb[1000];
      if (!spnbEntry) throw new Error("missing SpNb[1000]");
      const spptEntry = splineData.SpPt[1000];
      if (!spptEntry) throw new Error("missing SpPt[1000]");
      const spitEntry = splineData.SpIt[1000];
      if (!spitEntry) throw new Error("missing SpIt[1000]");
      expect(splnEntry.obj).toHaveLength(1);
      expect(spnbEntry.obj).toHaveLength(3);
      expect(spptEntry.obj).toHaveLength(10);
      expect(spitEntry.obj).toHaveLength(1);
    });

    it("should select splines array correctly", () => {
      const splines = selectSplines(mockData);
      expect(splines).toHaveLength(1);
      if (splines.length < 1) throw new Error("splines missing");
      const [firstSpline] = splines;
      if (!firstSpline) throw new Error("spline entry missing");
      expect(firstSpline.numNubs).toBe(3);
    });
  });
});
