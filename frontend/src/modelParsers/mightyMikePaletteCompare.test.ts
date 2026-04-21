import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { extractTGAPalette, setApplyColorCorrection } from "../utils/tgaParser";

describe("Mighty Mike TGA palette raw dump", () => {
  it("writes raw palette triplets (no color correction) for terrain scenes", () => {
    setApplyColorCorrection(false);

    const scenes = ["jurassic", "bargain", "fairy", "candy", "clown"];
    const results: Record<string, (number[] | null)[]> = {};

    for (const name of scenes) {
      const fp = join(
        process.cwd(),
        "frontend",
        "public",
        "assets",
        "mightyMike",
        "terrain",
        `${name}.tga`,
      );
      if (!existsSync(fp)) expect.fail(`Missing scene TGA: ${fp}`);
      const buf = readFileSync(fp);
      const arrBuf = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );

      const pal = extractTGAPalette(arrBuf);
      if (!pal) expect.fail(`Failed to extract palette for ${name}`);

      const triplets: (number[] | null)[] = [];
      for (let i = 0; i < 256; i++) {
        const off = i * 4;
        if (off + 2 < pal.colors.length) {
          triplets.push([
            pal.colors[off + 0] ?? 0,
            pal.colors[off + 1] ?? 0,
            pal.colors[off + 2] ?? 0,
          ]);
        } else {
          triplets.push(null);
        }
      }
      results[name] = triplets;
    }

    const outDir = join(process.cwd(), "frontend", "tests-output");
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, "mighty-mike-palette-raw-diff.json");
    writeFileSync(outPath, JSON.stringify(results, null, 2));

    expect(existsSync(outPath)).toBe(true);
  });
});
