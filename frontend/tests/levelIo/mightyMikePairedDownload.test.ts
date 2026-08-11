import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MightyMikeGlobals } from "@/data/globals/globals";
import { parseLevelBytes } from "@/data/level-io/parseLevelBytes";
import { serializeLevelDownloadBytes } from "@/data/level-io/serializeLevelBytes";
import {
  parseMightyMikeMap,
  parseMightyMikeTileSet,
} from "@/modelParsers/parseMightyMike";
import { decompressIfNeeded } from "@/modelParsers/parseMightyMikeHelpers";
import { extractTGAPaletteRaw } from "@/utils/tgaParser";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes.buffer;
}

function expectBytesToBeIdentical(
  actual: ArrayBuffer,
  expected: ArrayBuffer,
): void {
  const actualBytes = new Uint8Array(actual);
  const expectedBytes = new Uint8Array(expected);
  expect(actualBytes.byteLength).toBe(expectedBytes.byteLength);
  expect(actualBytes).toEqual(expectedBytes);
}

describe("Mighty Mike paired download", () => {
  it.each(["bargain", "candy", "clown", "fairy", "jurassic"])(
    "round-trips the stock %s map and tileset byte-for-byte through level I/O",
    async (sceneName) => {
      const assets = join(__dirname, "../../public/assets/mightyMike/terrain");
      const mapFileName = `${sceneName}.map-1`;
      const tilesetFileName = `${sceneName}.tileset`;
      const mapBytes = toArrayBuffer(readFileSync(join(assets, mapFileName)));
      const tilesetBytes = toArrayBuffer(
        readFileSync(join(assets, tilesetFileName)),
      );
      const paletteResult = extractTGAPaletteRaw(
        toArrayBuffer(readFileSync(join(assets, "border.tga"))),
      );
      expect(paletteResult).not.toBeNull();
      if (!paletteResult) return;
      const paletteBytes = toArrayBuffer(Buffer.from(paletteResult.colors));

      const parsed = await parseLevelBytes({
        levelBytes: mapBytes,
        globals: MightyMikeGlobals,
        mightyMikeTilesetBytes: tilesetBytes,
        mightyMikePaletteBytes: paletteBytes,
        mightyMikeSceneName: sceneName,
      });
      expect(parsed.isOk()).toBe(true);
      if (parsed.isErr()) return;

      const serialized = await serializeLevelDownloadBytes({
        levelData: parsed.value.levelData,
        globals: MightyMikeGlobals,
        fileName: mapFileName,
        mapImagesFileName: tilesetFileName,
        mapImages: parsed.value.mapImages,
      });
      expect(serialized.isOk()).toBe(true);
      if (serialized.isErr()) return;
      expect(serialized.value.map((file) => file.filename)).toEqual([
        mapFileName,
        tilesetFileName,
      ]);

      const mapFile = serialized.value[0];
      const tilesetFile = serialized.value[1];
      expect(mapFile).toBeDefined();
      expect(tilesetFile).toBeDefined();
      if (!mapFile || !tilesetFile) return;
      expectBytesToBeIdentical(
        decompressIfNeeded(toArrayBuffer(Buffer.from(mapFile.bytes))),
        decompressIfNeeded(mapBytes),
      );
      expectBytesToBeIdentical(
        decompressIfNeeded(toArrayBuffer(Buffer.from(tilesetFile.bytes))),
        decompressIfNeeded(tilesetBytes),
      );
      expect(
        parseMightyMikeMap(toArrayBuffer(Buffer.from(mapFile.bytes))).isOk(),
      ).toBe(true);
      const reparsedTileset = parseMightyMikeTileSet(
        toArrayBuffer(Buffer.from(tilesetFile.bytes)),
        undefined,
        { includeImages: false },
      );
      expect(reparsedTileset.isOk()).toBe(true);
      if (reparsedTileset.isOk()) {
        expect(reparsedTileset.value.numTileDefinitions).toBe(
          parsed.value.mapImages.length,
        );
      }

      const editorReparse = await parseLevelBytes({
        levelBytes: toArrayBuffer(Buffer.from(mapFile.bytes)),
        globals: MightyMikeGlobals,
        mightyMikeTilesetBytes: toArrayBuffer(Buffer.from(tilesetFile.bytes)),
        mightyMikePaletteBytes: paletteBytes,
        mightyMikeSceneName: sceneName,
      });
      expect(editorReparse.isOk()).toBe(true);
      if (editorReparse.isOk()) {
        expect(editorReparse.value.levelData).toEqual(parsed.value.levelData);
        expect(editorReparse.value.mapImages).toEqual(parsed.value.mapImages);
      }
    },
  );
});
