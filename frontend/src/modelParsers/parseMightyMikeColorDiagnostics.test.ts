import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { extractTGAPalette } from "../utils/tgaParser";
import { setApplyColorCorrection } from "../utils/tgaParser";

function nodeBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    const val = buffer[i];
    if (val !== undefined) {
      view[i] = val;
    }
  }
  return ab;
}

function parseTGAHeaderLocal(buffer: ArrayBuffer) {
  const dv = new DataView(buffer);
  return {
    idLength: dv.getUint8(0),
    colorMapType: dv.getUint8(1),
    imageType: dv.getUint8(2),
    colorMapOrigin: dv.getUint16(3, true),
    colorMapLength: dv.getUint16(5, true),
    colorMapDepth: dv.getUint8(7),
  };
}

interface PaletteStats {
  avgR: number;
  avgG: number;
  avgB: number;
  greenRatio: number;
  count: number;
}

interface SceneStats {
  header: unknown;
  paletteProvided: boolean;
  paletteBytesPerEntry: number;
  paletteStats: PaletteStats | null;
  paletteRawStats?: PaletteStats | null;
  rawPaletteBytes?: number[] | null;
}

describe("Mighty Mike Color Diagnostics", () => {
  const scenes = [
    { name: "jurassic", paletteFile: "dinoscene.tga" },
    { name: "bargain", paletteFile: "bargainscene.tga" },
    { name: "fairy", paletteFile: "fairyscene.tga" },
    { name: "candy", paletteFile: "candyscene.tga" },
    { name: "clown", paletteFile: "clownscene.tga" },
  ];

  const baseDir = join(__dirname, "../../public/assets/mightyMike/terrain");

  const sceneStats: Record<string, SceneStats> = {};

  beforeAll(() => {
    for (const scene of scenes) {
      const palettePath = join(baseDir, scene.paletteFile);

      const palBuf = nodeBufferToArrayBuffer(readFileSync(palettePath));

      const header = parseTGAHeaderLocal(palBuf);
      // First, extract with color correction enabled (default)
      const paletteResult = extractTGAPalette(palBuf);
      // Then extract raw (no correction) for comparison by toggling the parser flag
      setApplyColorCorrection(false);
      const paletteRawResult = extractTGAPalette(palBuf);
      setApplyColorCorrection(true);
      const paletteBytesPerEntry = header.colorMapDepth / 8;

      const stats: SceneStats = {
        header,
        paletteProvided: !!paletteResult,
        paletteBytesPerEntry,
        paletteStats: null,
      };

      function analysePalette(colors: Uint8ClampedArray) {
        const count = Math.min(256, colors.length / 4);
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let greenCount = 0;
        for (let i = 0; i < count; i++) {
          const o = i * 4;
          const r = colors[o] ?? 0;
          const g = colors[o + 1] ?? 0;
          const b = colors[o + 2] ?? 0;
          sumR += r;
          sumG += g;
          sumB += b;
          if (g > r + 20 && g > b + 20) greenCount++;
        }
        return {
          avgR: sumR / count,
          avgG: sumG / count,
          avgB: sumB / count,
          greenRatio: greenCount / count,
          count,
        };
      }

      stats.paletteStats = paletteResult
        ? analysePalette(paletteResult.colors)
        : null;
      stats.paletteRawStats = paletteRawResult
        ? analysePalette(paletteRawResult.colors)
        : null;

      // Record raw palette bytes (B,G,R triplets) for easier offline diffing
      const rawPaletteBytes: number[] | null = paletteResult
        ? Array.from(
            new Uint8Array(
              palBuf,
              18,
              header.colorMapLength * (header.colorMapDepth / 8),
            ),
          )
        : null;

      sceneStats[scene.name] = {
        ...stats,
        rawPaletteBytes,
      };
    }
  });

  it("should detect palette format differences and color statistics", async () => {
    // Write diagnostics JSON to tests-output for offline inspection
    try {
      const outDir = join(__dirname, "../../tests-output");
      // Ensure directory exists
      const { existsSync, mkdirSync, writeFileSync } = await import("fs");
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, "mighty-mike-palette-diagnostics.json");
      writeFileSync(outPath, JSON.stringify(sceneStats, null, 2));
      console.log(`Wrote palette diagnostics to ${outPath}`);
    } catch {
      // Best-effort write; ignore errors in CI
    }

    // Check that bargain/fairy palettes exist and that one of them
    // has the highest greenRatio among scenes (i.e. they look 'correct')
    const ratios: Record<string, number> = {};
    for (const name of Object.keys(sceneStats)) {
      const stats = sceneStats[name];
      if (stats) {
        ratios[name] = stats.paletteStats ? stats.paletteStats.greenRatio : 0;
      }
    }

    const entries = Object.entries(ratios);
    entries.sort((a, b) => b[1] - a[1]);
    const topScene = entries[0]?.[0];
    console.log("Top greenRatio scene:", topScene, entries[0]?.[1]);

    // For now just assert that each scene provided a palette and produced palette stats
    for (const name of Object.keys(sceneStats)) {
      const stats = sceneStats[name];
      if (stats) {
        expect(stats.paletteProvided).toBeTruthy();
        expect(stats.paletteStats).not.toBeNull();
      }
    }
  });
});
