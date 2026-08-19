import { describe, expect, it } from "vitest";
import type {
  LevelData,
  TerrainItem,
} from "@/python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessorTypes";
import { compileNanosaur1Level } from "./compileNanosaur1Level";

function createRawNanosaurLevel(): Nanosaur1LevelData {
  return {
    header: {
      textureLayerOffset: 40,
      heightmapLayerOffset: 0,
      pathLayerOffset: 0,
      objectListOffset: 80,
      unknown1: 0,
      heightmapTilesOffset: 0,
      unknown2: 0,
      width: 2,
      depth: 2,
      textureAttribOffset: 0,
      tileAnimDataOffset: 200,
    },
    textureLayer: [0, 1, 2, 3],
    heightmapLayer: null,
    pathLayer: null,
    objectList: [
      {
        x: 111,
        y: 222,
        type: 123,
        parm: [1, 2, 3, 4],
        flags: 5,
        prevItemIdx: 6,
        nextItemIdx: 7,
      },
    ],
    textureAttributes: [],
    tileAnimData: new Uint8Array(0),
  };
}

describe("compileNanosaur1Level", () => {
  function createEditorLevelData(items: TerrainItem<number>[]): LevelData {
    return {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            version: 1,
            numItems: items.length,
            mapWidth: 2,
            mapHeight: 2,
            tileSize: 32,
            minY: 0,
            maxY: 0,
            numSplines: 0,
            numFences: 0,
            numTilePages: 1,
            numTiles: 4,
            numUniqueSupertiles: 0,
            numWaterPatches: 0,
            numCheckpoints: 0,
          },
          order: 0,
        },
      },
      Itms: {
        1000: {
          name: "Terrain Items List",
          obj: items,
          order: 0,
        },
      },
      Layr: {
        1000: {
          name: "Terrain Layer Matrix",
          obj: [0, 0, 0, 0],
          order: 0,
        },
      },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
      ItCo: {
        1000: { name: "Terrain Items Color Array", data: "", order: 0 },
      },
      YCrd: {
        1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 },
      },
      alis: {},
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
    };
  }

  function compileItem(item: TerrainItem<number>): DataView | null {
    const rawLevel = createRawNanosaurLevel();
    const levelData = createEditorLevelData([item]);

    const result = compileNanosaur1Level(levelData, rawLevel);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return null;
    }
    return new DataView(result.value);
  }

  it("uses the editor item list even when it is empty", () => {
    const rawLevel = createRawNanosaurLevel();
    const levelData = createEditorLevelData([]);

    const result = compileNanosaur1Level(levelData, rawLevel);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    const view = new DataView(result.value);
    expect(view.getInt32(rawLevel.header.objectListOffset, false)).toBe(0);
  });

  it("prefers editor z values and keeps raw item metadata when serializing", () => {
    const rawLevel = createRawNanosaurLevel();
    const levelData = createEditorLevelData([
      Object.assign({
        x: 9,
        z: 21,
        type: 42,
        flags: 12,
        p0: 1,
        p1: 2,
        p2: 3,
        p3: 4,
      }, { prevItemIdx: 13, nextItemIdx: 14 }),
    ]);

    const result = compileNanosaur1Level(levelData, rawLevel);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    const view = new DataView(result.value);
    expect(view.getInt32(rawLevel.header.objectListOffset, false)).toBe(1);
    expect(view.getUint16(rawLevel.header.objectListOffset + 4, false)).toBe(9);
    expect(view.getUint16(rawLevel.header.objectListOffset + 6, false)).toBe(21);
    expect(view.getUint16(rawLevel.header.objectListOffset + 8, false)).toBe(42);
    expect(view.getUint8(rawLevel.header.objectListOffset + 10)).toBe(1);
    expect(view.getUint8(rawLevel.header.objectListOffset + 11)).toBe(2);
    expect(view.getUint8(rawLevel.header.objectListOffset + 12)).toBe(3);
    expect(view.getUint8(rawLevel.header.objectListOffset + 13)).toBe(4);
    expect(view.getUint16(rawLevel.header.objectListOffset + 14, false)).toBe(12);
    expect(view.getInt32(rawLevel.header.objectListOffset + 16, false)).toBe(13);
    expect(view.getInt32(rawLevel.header.objectListOffset + 20, false)).toBe(14);
  });

  it("preserves raw parameters for an unchanged parsed editor item", () => {
    const parm: [number, number, number, number] = [11, 22, 33, 44];
    const item = Object.assign(
      {
      x: 9,
      z: 21,
      type: 42,
      flags: 12,
      p0: 11,
      p1: 22,
      p2: 33,
      p3: 44,
      },
      { y: 222, parm, prevItemIdx: 13, nextItemIdx: 14 },
    );
    const view = compileItem(item);
    const offset = createRawNanosaurLevel().header.objectListOffset + 4;
    if (!view) return;

    expect(Array.from({ length: 4 }, (_, index) => view.getUint8(offset + 6 + index))).toEqual([
      11,
      22,
      33,
      44,
    ]);
  });

  it("uses an edited p field while preserving the other raw parameters", () => {
    const parm: [number, number, number, number] = [11, 22, 33, 44];
    const item = Object.assign(
      {
      x: 9,
      z: 21,
      type: 42,
      flags: 12,
      p0: 11,
      p1: 99,
      p2: 33,
      p3: 44,
      },
      { parm },
    );
    const view = compileItem(item);
    const offset = createRawNanosaurLevel().header.objectListOffset + 4;
    if (!view) return;

    expect(Array.from({ length: 4 }, (_, index) => view.getUint8(offset + 6 + index))).toEqual([
      11,
      99,
      33,
      44,
    ]);
  });

  it.each([
    [0, 1, 127, 128],
    [255, 254, 129, 0],
  ])("roundtrips parameter boundary values %j", (...parm) => {
    const item = Object.assign(
      {
        x: 9,
        z: 21,
        type: 42,
        flags: 0,
        p0: parm[0] ?? 0,
        p1: parm[1] ?? 0,
        p2: parm[2] ?? 0,
        p3: parm[3] ?? 0,
      },
      { parm },
    );
    const view = compileItem(item);
    const offset = createRawNanosaurLevel().header.objectListOffset + 4;
    if (!view) return;

    expect(Array.from({ length: 4 }, (_, index) => view.getUint8(offset + 6 + index))).toEqual(parm);
  });
});
