import { describe, expect, it } from "vitest";
import {
  extractMightyMikeTilesetPreservedData,
  mightyMikeTileSetToBinary,
  parseMightyMikeTileSet,
} from "./parseMightyMike";

function createPalette(): number[] {
  return Array.from({ length: 256 }, (_, index) => [index, index, index, 255]).flat();
}

function createTile(colorIndex: number) {
  const rgba = new Uint8Array(32 * 32 * 4);
  for (let pixel = 0; pixel < 32 * 32; pixel += 1) {
    const offset = pixel * 4;
    rgba[offset] = colorIndex;
    rgba[offset + 1] = colorIndex;
    rgba[offset + 2] = colorIndex;
    rgba[offset + 3] = 255;
  }
  return { width: 32, height: 32, rgbaBytes: rgba.buffer };
}

describe("Mighty Mike tileset serialization", () => {
  it("round-trips every tileset section and edited tile pixels", () => {
    const result = mightyMikeTileSetToBinary({
      tileset: {
        numTileDefinitions: 2,
        numXlateEntries: 3,
        numTileAttributeEntries: 3,
        numTileAnims: 1,
        numTileXparentColors: 2,
        xlateTable: [0, 1, 0],
        tileAttributes: [
          { flags: 1, p0: -12, p1: 3, p2: 4, p3: 5, p4: 6 },
          { flags: 2, p0: 14, p1: 7, p2: 8, p3: 9, p4: 10 },
          { flags: 4, p0: 16, p1: 11, p2: 12, p3: 13, p4: 14 },
        ],
        tileAnimations: [
          {
            name: "water",
            speed: 9,
            baseTile: 1,
            numFrames: 2,
            tileNums: [0, 1],
          },
        ],
        transparencyColors: [0, 255],
      },
      tileImages: [createTile(12), createTile(240)],
      paletteRgbaBytes: createPalette(),
      preservedData: {
        headerPrefixBytes: [10, 11, 12, 13, 14, 15],
        preTileDefinitionBytes: [1, 2, 3, 4],
        legacyPaletteEntryCount: 1,
        legacyPaletteBytes: [5, 6, 7, 8, 9, 10],
        animationNameFieldBytes: [],
        trailingBytes: [16, 17, 18],
      },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    const parsed = parseMightyMikeTileSet(result.value, undefined, {
      includeImages: false,
    });
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.xlateTable).toEqual([0, 1, 0]);
    expect(parsed.value.tileAttributes).toEqual([
      { flags: 1, p0: -12, p1: 3, p2: 4, p3: 5, p4: 6 },
      { flags: 2, p0: 14, p1: 7, p2: 8, p3: 9, p4: 10 },
      { flags: 4, p0: 16, p1: 11, p2: 12, p3: 13, p4: 14 },
    ]);
    expect(parsed.value.tileAnimations).toEqual([
      {
        name: "water",
        speed: 9,
        baseTile: 1,
        numFrames: 2,
        tileNums: [0, 1],
      },
    ]);
    expect(parsed.value.transparencyColors).toEqual([0, 255]);

    const preserved = extractMightyMikeTilesetPreservedData(result.value);
    expect(preserved.isOk()).toBe(true);
    if (preserved.isOk()) {
      expect(preserved.value).toEqual({
        headerPrefixBytes: [10, 11, 12, 13, 14, 15],
        preTileDefinitionBytes: [1, 2, 3, 4],
        legacyPaletteEntryCount: 1,
        legacyPaletteBytes: [5, 6, 7, 8, 9, 10],
        animationNameFieldBytes: [
          [5, 119, 97, 116, 101, 114, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ],
        trailingBytes: [16, 17, 18],
      });
    }
  });
});
