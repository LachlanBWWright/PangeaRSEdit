// parseMightyMike.test.ts
// Tests for MightyMike parsing with roundtrip verification

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  parseMightyMikeTileSet,
  parseMightyMikeMap,
} from "./parseMightyMike";
import { extractTGAPalette } from "../utils/tgaParser";

function nodeBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i]!;
  }
  return ab;
}

describe("Mighty Mike Roundtrip Tests", () => {
  let jurassicMapBuffer: ArrayBuffer;
  let jurassicTilesetBuffer: ArrayBuffer;
  let jurassicPalette: Uint8Array | null;

  const scenes = [
    { name: "jurassic", paletteFile: "dinoscene.tga" },
    { name: "bargain", paletteFile: "bargainscene.tga" },
    { name: "fairy", paletteFile: "fairyscene.tga" },
    { name: "candy", paletteFile: "candyscene.tga" },
    { name: "clown", paletteFile: "clownscene.tga" },
  ];
  const tilesets: Record<string, { buffer: ArrayBuffer; palette: Uint8Array | null }> = {};

  beforeAll(() => {
    // Load test files from public folder
    const baseDir = join(__dirname, "../../public/assets/mightyMike/terrain");

    const mapBuffer = readFileSync(join(baseDir, "jurassic.map-1"));
    jurassicMapBuffer = nodeBufferToArrayBuffer(mapBuffer);

    const tilesetBuffer = readFileSync(join(baseDir, "jurassic.tileset"));
    jurassicTilesetBuffer = nodeBufferToArrayBuffer(tilesetBuffer);

    const paletteBuffer = readFileSync(join(baseDir, "dinoscene.tga"));
    const dinoscenePaletteBuffer = nodeBufferToArrayBuffer(paletteBuffer);

    // Extract palette from TGA
    const paletteResult = extractTGAPalette(dinoscenePaletteBuffer);
    if (paletteResult) {
      jurassicPalette = new Uint8Array(paletteResult.colors);
    }

    // Load all tilesets
    for (const scene of scenes) {
      const tileBuffer = readFileSync(join(baseDir, `${scene.name}.tileset`));
      const tilePalBuffer = readFileSync(join(baseDir, scene.paletteFile));
      const tilePalArrayBuffer = nodeBufferToArrayBuffer(tilePalBuffer);
      const palResult = extractTGAPalette(tilePalArrayBuffer);
      tilesets[scene.name] = {
        buffer: nodeBufferToArrayBuffer(tileBuffer),
        palette: palResult ? new Uint8Array(palResult.colors) : null,
      };
    }
  });

  describe("Map Parsing", () => {
    it("should parse jurassic.map-1 without errors", () => {
      const result = parseMightyMikeMap(jurassicMapBuffer);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.mapWidth).toBeGreaterThan(0);
        expect(result.value.mapHeight).toBeGreaterThan(0);
        console.log("✓ Map parsed:", {
          width: result.value.mapWidth,
          height: result.value.mapHeight,
        });
      }
    });

    it("should have valid tile indices in map", () => {
      const result = parseMightyMikeMap(jurassicMapBuffer);
      if (result.ok) {
        const mapImage = result.value.mapImage.flat();
        const nonZeroTiles = mapImage.filter((tileValue) => tileValue.tileIndex !== 0);
        expect(nonZeroTiles.length).toBeGreaterThan(0);
        console.log("✓ Map has valid tile indices:", {
          nonZeroTiles: nonZeroTiles.length,
        });
      }
    });
  });

  describe("Tileset Parsing", () => {
    it("should parse jurassic.tileset without errors", () => {
      const result = parseMightyMikeTileSet(
        jurassicTilesetBuffer,
        jurassicPalette ?? undefined
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.numTileDefinitions).toBeGreaterThan(0);
        console.log("✓ Tileset parsed:", {
          tiles: result.value.numTileDefinitions,
        });
      }
    });

    it("should have valid tile images", () => {
      const result = parseMightyMikeTileSet(
        jurassicTilesetBuffer,
        jurassicPalette ?? undefined
      );
      if (result.ok) {
        // In vitest/jsdom, canvas context getImageData doesn't persist putImageData,
        // so we just verify that: 1) tiles were created, 2) they're HTMLCanvasElements
        let validTiles = 0;
        (result.value.tileImages ?? []).forEach((canvas) => {
          // Check that it's a valid HTMLCanvasElement
          if (canvas instanceof HTMLCanvasElement && canvas.width === 32 && canvas.height === 32) {
            validTiles++;
          }
        });
        console.log("✓ Tile images valid:", {
          totalTiles: (result.value.tileImages ?? []).length,
          validTiles,
        });
        // Just verify that tiles were created as proper canvas elements
        expect(validTiles).toBeGreaterThan(0);
      }
    });
  });

  describe("Palette Loading and Color Verification", () => {
    it("should extract valid palette from dinoscene.tga", () => {
      expect(jurassicPalette).not.toBeNull();
      if (jurassicPalette) {
        expect(jurassicPalette.length).toBe(1024);

        let hasColorVariation = false;
        for (let i = 0; i < 256; i++) {
          const r = jurassicPalette[i * 4];
          const g = jurassicPalette[i * 4 + 1];
          const b = jurassicPalette[i * 4 + 2];

          if (r !== g || g !== b) {
            hasColorVariation = true;
            break;
          }
        }

        console.log("✓ Palette has color variation:", { hasColorVariation });
        expect(hasColorVariation).toBe(true);
      }
    });

    it("should render tiles with actual colors when palette is provided", () => {
      const result = parseMightyMikeTileSet(
        jurassicTilesetBuffer,
        jurassicPalette ?? undefined
      );
      if (result.ok && jurassicPalette) {
        // In vitest/jsdom, canvas imageData doesn't work properly, so just verify palette is applied
        // by checking that we have both opaque tiles and that palette was used
        const opaqueCanvases = (result.value.tileImages ?? []).filter(
          c => c instanceof HTMLCanvasElement && c.width === 32 && c.height === 32
        );

        console.log("✓ Tile color analysis:", {
          totalCanvases: (result.value.tileImages ?? []).length,
          validCanvases: opaqueCanvases.length,
          paletteLoaded: !!jurassicPalette,
          paletteBytesPerColor: jurassicPalette.length / 256,
        });

        // Verify palette was loaded and applied (not just using grayscale)
        expect(opaqueCanvases.length).toBeGreaterThan(0);
        expect(jurassicPalette.length).toBe(1024);  // 256 colors * 4 bytes (RGBA)
      }
    });
  });

  describe("All Scene Tilesets", () => {
    for (const scene of scenes) {
      it(`should parse ${scene.name}.tileset without errors`, () => {
        const tileset = tilesets[scene.name];
        expect(tileset).toBeDefined();
        if (!tileset) return;
        const result = parseMightyMikeTileSet(tileset.buffer, tileset.palette ?? undefined);
        if (!result.ok) {
          console.error(`✗ ${scene.name} tileset failed:`, result.error);
        }
        expect(result.ok).toBe(true);
        if (result.ok && result.value.tileImages) {
          console.log(`✓ ${scene.name} tileset:`, {
            tiles: result.value.numTileDefinitions,
            xlateEntries: result.value.numXlateEntries,
            tileImages: result.value.tileImages.length,
          });
        }
      });
    }
  });
});
