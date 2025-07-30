import { describe, it, expect, beforeEach } from 'vitest';
import { 
  selectHeaderData, 
  selectItemData, 
  selectLiquidData, 
  selectFenceData, 
  selectSplineData,
  selectItems,
  selectLiquids,
  selectFences,
  selectSplines 
} from './index';
import { ottoMaticLevel } from '../../python/structSpecs/ottoMaticInterface';

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
        numCheckpoints: 5
      },
      order: 0
    }
  },
  Itms: {
    1000: {
      name: "Terrain Items List",
      obj: [
        { x: 10, z: 20, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
        { x: 30, z: 40, type: 2, flags: 1, p0: 1, p1: 1, p2: 1, p3: 1 }
      ],
      order: 1
    }
  },
  Liqd: {
    1000: {
      name: "Water List",
      obj: [
        {
          type: 1,
          flags: 0,
          height: 10,
          numNubs: 4,
          reserved: 0,
          nubs: [[0, 0], [10, 0], [10, 10], [0, 10]],
          hotSpotX: 5,
          hotSpotZ: 5,
          bBoxTop: 10,
          bBoxLeft: 0,
          bBoxBottom: 0,
          bBoxRight: 10
        }
      ],
      order: 2
    }
  },
  Fenc: {
    1000: {
      name: "Fence List",
      obj: [
        {
          fenceType: 1,
          numNubs: 2,
          junkNubListPtr: 0,
          bbTop: 10,
          bbBottom: 0,
          bbLeft: 0,
          bbRight: 10
        }
      ],
      order: 3
    }
  },
  FnNb: {
    1000: {
      name: "Fence Nub List",
      obj: [[0, 0], [10, 10]],
      order: 4
    }
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
          bbRight: 20
        }
      ],
      order: 5
    }
  },
  SpNb: {
    1000: {
      name: "Spline Nub List",
      obj: [
        { x: 0, z: 0 },
        { x: 10, z: 10 },
        { x: 20, z: 0 }
      ],
      order: 6
    }
  },
  SpPt: {
    1000: {
      name: "Spline Point List",
      obj: Array(10).fill(0).map((_, i) => ({ x: i * 2, z: Math.sin(i) * 5 })),
      order: 7
    }
  },
  SpIt: {
    1000: {
      name: "Spline Item List",
      obj: [
        {
          type: 1,
          placement: 0.5,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0
        }
      ],
      order: 8
    }
  },
  // Required fields for the interface
  Atrb: {
    1000: {
      name: "Tile Attribute Data",
      obj: [],
      order: 9
    }
  },
  Timg: {
    1000: {
      name: "Extracted Tile Image Data 32x32/16bit",
      data: "",
      order: 10
    }
  },
  ItCo: {
    1000: {
      name: "Terrain Items Color Array",
      data: "",
      order: 11
    }
  },
  Layr: {
    1000: {
      name: "Terrain Layer Matrix",
      obj: [],
      order: 12
    }
  },
  STgd: {
    1000: {
      name: "SuperTile Grid",
      obj: [],
      order: 13
    }
  },
  YCrd: {
    1000: {
      name: "Floor&Ceiling Y Coords",
      obj: [],
      order: 14
    }
  },
  alis: {},
  _metadata: {
    file_attributes: 0,
    junk1: 0,
    junk2: 0
  }
});

describe('Data Selectors', () => {
  let mockData: ottoMaticLevel;

  beforeEach(() => {
    mockData = createMockLevelData();
  });

  describe('Header Data Selectors', () => {
    it('should select header data correctly', () => {
      const headerData = selectHeaderData(mockData);
      expect(headerData).toBeTruthy();
      expect(headerData?.Hedr[1000].obj.version).toBe(1);
      expect(headerData?.Hedr[1000].obj.numItems).toBe(2);
    });

    it('should return null when no header data exists', () => {
      const emptyData = { ...mockData, Hedr: undefined } as any;
      const headerData = selectHeaderData(emptyData);
      expect(headerData).toBeNull();
    });
  });

  describe('Item Data Selectors', () => {
    it('should select item data correctly', () => {
      const itemData = selectItemData(mockData);
      expect(itemData).toBeTruthy();
      expect(itemData?.Itms[1000].obj).toHaveLength(2);
    });

    it('should select items array correctly', () => {
      const items = selectItems(mockData);
      expect(items).toHaveLength(2);
      expect(items[0].x).toBe(10);
      expect(items[1].x).toBe(30);
    });

    it('should return empty array when no items exist', () => {
      const emptyData = { ...mockData, Itms: undefined } as any;
      const items = selectItems(emptyData);
      expect(items).toEqual([]);
    });
  });

  describe('Liquid Data Selectors', () => {
    it('should select liquid data correctly', () => {
      const liquidData = selectLiquidData(mockData);
      expect(liquidData).toBeTruthy();
      expect(liquidData?.Liqd[1000].obj).toHaveLength(1);
    });

    it('should select liquids array correctly', () => {
      const liquids = selectLiquids(mockData);
      expect(liquids).toHaveLength(1);
      expect(liquids[0].type).toBe(1);
    });
  });

  describe('Fence Data Selectors', () => {
    it('should select fence data correctly', () => {
      const fenceData = selectFenceData(mockData);
      expect(fenceData).toBeTruthy();
      expect(fenceData?.Fenc[1000].obj).toHaveLength(1);
      expect(fenceData?.FnNb[1000].obj).toHaveLength(2);
    });

    it('should select fences array correctly', () => {
      const fences = selectFences(mockData);
      expect(fences).toHaveLength(1);
      expect(fences[0].fenceType).toBe(1);
    });
  });

  describe('Spline Data Selectors', () => {
    it('should select spline data correctly', () => {
      const splineData = selectSplineData(mockData);
      expect(splineData).toBeTruthy();
      expect(splineData?.Spln[1000].obj).toHaveLength(1);
      expect(splineData?.SpNb[1000].obj).toHaveLength(3);
      expect(splineData?.SpPt[1000].obj).toHaveLength(10);
      expect(splineData?.SpIt[1000].obj).toHaveLength(1);
    });

    it('should select splines array correctly', () => {
      const splines = selectSplines(mockData);
      expect(splines).toHaveLength(1);
      expect(splines[0].numNubs).toBe(3);
    });
  });
});