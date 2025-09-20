import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import * as fs from "fs";
import * as path from "path";

// Expand tests: (A) robust Nanosaur2 model checks, (B) diagnostic smoke-test across all games

function findFirstBg3dIn(dir: string): string | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    const bg3d = files.find((f) => f.toLowerCase().endsWith(".bg3d"));
    if (bg3d) return path.join(dir, bg3d);
  } catch (err) {
    // ignore
  }
  return null;
}

describe("Nanosaur2 BG3D parsing", () => {
  it("parses a Nanosaur2 .bg3d and validates JPEG texture presence and basic model invariants", () => {
    const searchDirs = [
      path.resolve(__dirname, "../../public/games/nanosaur2/models"),
      path.resolve(__dirname, "../../public/games/nanosaur2"),
    ];

    let filePath: string | null = null;
    for (const d of searchDirs) {
      const found = findFirstBg3dIn(d);
      if (found) {
        filePath = found;
        break;
      }
    }

    if (!filePath) {
      throw new Error(
        "No Nanosaur2 .bg3d sample found under frontend/public/games/nanosaur2 — add one to run this test",
      );
    }

    const data = fs.readFileSync(filePath);
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    );

    const result = parseBG3D(arrayBuffer as ArrayBuffer);

    // Basic expectations
    expect(result).toBeTruthy();
    expect(Array.isArray(result.materials)).toBe(true);
    expect(result.materials.length).toBeGreaterThan(0);
    expect(Array.isArray(result.groups)).toBe(true);
    expect(result.groups.length).toBeGreaterThan(0);

    // Material-texture invariants
    for (const mat of result.materials) {
      // name may be empty, but textures should be an array
      expect(Array.isArray(mat.textures)).toBe(true);
      for (const tex of mat.textures) {
        // If the texture claims to be JPEG, it should have a pixels buffer
        if ((tex as any).isJPEG) {
          expect((tex as any).pixels).toBeInstanceOf(Uint8Array);
          expect((tex as any).pixels.length).toBeGreaterThan(0);
        }
      }
    }

    // Ensure at least one JPEG texture exists in the model (Nanosaur2 is expected to include JPEGs)
    const hasJPEG = result.materials.some((m) =>
      m.textures.some((t: any) => t.isJPEG),
    );
    expect(hasJPEG).toBeTruthy();
  });

  it("diagnostic: attempts to parse all .bg3d files under frontend/public/games and reports failures (does not fail on the whole suite)", () => {
    const gamesDir = path.resolve(__dirname, "../../public/games");
    if (!fs.existsSync(gamesDir)) {
      // no games directory available in this environment; skip
      return;
    }

    const failed: Array<{ file: string; error: string }> = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir)) {
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (stat.isFile() && entry.toLowerCase().endsWith(".bg3d")) {
          try {
            const data = fs.readFileSync(full);
            const arrayBuffer = data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength,
            );
            // parse but swallow exceptions to collect diagnostics
            parseBG3D(arrayBuffer as ArrayBuffer);
          } catch (err: any) {
            failed.push({
              file: full,
              error: String(err && err.message ? err.message : err),
            });
          }
        }
      }
    }

    walk(gamesDir);

    // Log the failures for debugging; assert that at least one file parsed (sanity) and then
    // attach diagnostic output to the test failure if many files failed.
    const totalBg3d = (() => {
      let n = 0;
      function count(dir: string) {
        for (const entry of fs.readdirSync(dir)) {
          const full = path.join(dir, entry);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) count(full);
          else if (stat.isFile() && entry.toLowerCase().endsWith(".bg3d")) n++;
        }
      }
      try {
        count(gamesDir);
      } catch (e) {
        return 0;
      }
      return n;
    })();

    // At least one .bg3d should exist in the games folder for this diagnostic to be meaningful
    if (totalBg3d === 0) return;

    // If there are failures, print a short summary and fail the diagnostic test so CI shows details
    if (failed.length > 0) {
      // Build a compact message showing up to 10 failures
      const head = failed
        .slice(0, 10)
        .map((f) => `${path.relative(process.cwd(), f.file)}: ${f.error}`);
      const msg =
        `parseBG3D diagnostic found ${failed.length} failing .bg3d files (showing up to 10):\n` +
        head.join("\n");
      throw new Error(msg);
    }
  });
});
