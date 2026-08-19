import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { updateTileAttributeForPaletteImage } from "@/editor/subviews/mightymike/mightyMikeTileMenuState";
import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";
import { serializeLevelDownloadBytes } from "@/data/level-io/serializeLevelBytes";
import { MightyMikeGlobals } from "@/data/globals/globals";
import {
  parseMightyMikeMap,
  parseMightyMikeTileSet,
} from "@/modelParsers/parseMightyMike";

interface TestAttribute {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

function createTerrainData(): TerrainData<TestAttribute> {
  const attributes = [
    { flags: 0, p0: 2, p1: 3, p2: 4, p3: 0, p4: 0 },
    { flags: 8, p0: 9, p1: 9, p2: 9, p3: 0, p4: 0 },
    { flags: 16, p0: 5, p1: 6, p2: 7, p3: 0, p4: 0 },
  ];
  return {
    Atrb: {
      1000: { name: "Tile Attribute Data", obj: attributes, order: 6 },
    },
    Xlat: {
      1000: {
        name: "Tile Index Translation Table",
        obj: [{ idx: 4 }, { idx: 4 }, { idx: 8 }],
        order: 7,
      },
    },
    ItCo: {
      1000: { name: "Terrain Items Color Array", data: "", order: 3 },
    },
    Layr: {
      1000: { name: "Terrain Layer Matrix", obj: [0, 1, 2], order: 1 },
    },
    YCrd: {
      1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 4 },
    },
    alis: {},
    _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
    tileset: {
      xlateTable: [4, 4, 8],
      tileAttributes: attributes.map((attribute) => ({ ...attribute })),
    },
  };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

describe("Mighty Mike palette behaviour", () => {
  test("updates every definition sharing an image without changing map or translations", () => {
    const terrainData = createTerrainData();
    const originalLayer = [...(terrainData.Layr?.[1000].obj ?? [])];
    const originalTranslation = terrainData.Xlat?.[1000].obj.map(
      (entry) => entry.idx,
    );

    updateTileAttributeForPaletteImage(terrainData, 4, "flags", 1);

    expect(terrainData.Atrb[1000].obj[0]).toMatchObject({
      flags: 1,
      p0: 2,
      p1: 3,
      p2: 4,
    });
    expect(terrainData.Atrb[1000].obj[1]).toMatchObject({
      flags: 1,
      p0: 2,
      p1: 3,
      p2: 4,
    });
    expect(terrainData.Atrb[1000].obj[2]?.flags).toBe(16);
    expect(terrainData.Layr?.[1000].obj).toEqual(originalLayer);
    expect(terrainData.Xlat?.[1000].obj.map((entry) => entry.idx)).toEqual(
      originalTranslation,
    );
  });

  test("exports Solid Top on the logical tile used by the map", async () => {
    const assets = join(__dirname, "../../public/assets/mightyMike/terrain");
    const mapBytes = toArrayBuffer(readFileSync(join(assets, "jurassic.map-1")));
    const tilesetBytes = toArrayBuffer(
      readFileSync(join(assets, "jurassic.tileset")),
    );
    const parsed = await parseLevelBytes({
      levelBytes: mapBytes,
      globals: MightyMikeGlobals,
      mightyMikeTilesetBytes: tilesetBytes,
      mightyMikeSceneName: "jurassic",
    });
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;

    const logicalIndex = parsed.value.levelData.Layr?.[1000].obj[0];
    expect(logicalIndex).toBeDefined();
    if (logicalIndex === undefined) return;
    const imageIndex = parsed.value.levelData.Xlat?.[1000].obj[logicalIndex]?.idx;
    expect(imageIndex).toBeDefined();
    if (imageIndex === undefined) return;
    updateTileAttributeForPaletteImage(
      parsed.value.levelData,
      imageIndex,
      "flags",
      1,
    );

    const serialized = await serializeLevelDownloadBytes({
      levelData: parsed.value.levelData,
      globals: MightyMikeGlobals,
      fileName: "jurassic.map-1",
      mapImagesFileName: "jurassic.tileset",
      mapImages: parsed.value.mapImages,
    });
    expect(serialized.isOk()).toBe(true);
    if (serialized.isErr()) return;
    const mapFile = serialized.value[0];
    const tilesetFile = serialized.value[1];
    expect(mapFile).toBeDefined();
    expect(tilesetFile).toBeDefined();
    if (!mapFile || !tilesetFile) return;

    const reparsedMap = parseMightyMikeMap(toArrayBuffer(mapFile.bytes));
    const reparsedTileset = parseMightyMikeTileSet(
      toArrayBuffer(tilesetFile.bytes),
      undefined,
      { includeImages: false },
    );
    expect(reparsedMap.isOk()).toBe(true);
    expect(reparsedTileset.isOk()).toBe(true);
    if (reparsedMap.isErr() || reparsedTileset.isErr()) return;
    const exportedLogicalIndex = reparsedMap.value.mapImage[0]?.[0]?.tileIndex;
    expect(exportedLogicalIndex).toBeDefined();
    if (exportedLogicalIndex === undefined) return;
    expect(exportedLogicalIndex).toBe(logicalIndex);
    expect(reparsedTileset.value.xlateTable[exportedLogicalIndex]).toBe(
      imageIndex,
    );
    const exportedFlags =
      reparsedTileset.value.tileAttributes[exportedLogicalIndex]?.flags;
    expect(exportedFlags).toBeDefined();
    if (exportedFlags === undefined) return;
    expect(exportedFlags & 1).toBe(1);
  });
});
