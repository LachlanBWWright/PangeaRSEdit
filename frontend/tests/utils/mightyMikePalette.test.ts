/**
 * Tests for Mighty Mike palette source validation
 *
 * The game sets its palette from border.tga (loaded in InitArea → LoadBorderImage),
 * NOT from per-scene cinema TGA files. Some scene TGAs happened to share the same
 * palette as border.tga (fairy, bargain) while others did not (jurassic, candy,
 * clown), which caused color mismatches in the editor.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { extractTGAPalette } from "@/utils/tgaParser";

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

describe("Mighty Mike border.tga palette", () => {
  const terrainDir = join(
    process.cwd(),
    "public",
    "assets",
    "mightyMike",
    "terrain",
  );

  it("border.tga exists in editor assets", () => {
    expect(existsSync(join(terrainDir, "border.tga"))).toBe(true);
  });

  it("border.tga contains a valid 256-color palette", () => {
    const buffer = readFileSync(join(terrainDir, "border.tga"));
    const arrayBuffer = nodeBufferToArrayBuffer(buffer);
    const palette = extractTGAPalette(arrayBuffer);

    expect(palette).not.toBeNull();
    expect(palette?.colors.length).toBe(256 * 4);
  });

  it("border.tga palette starts with white and ends with black", () => {
    const buffer = readFileSync(join(terrainDir, "border.tga"));
    const arrayBuffer = nodeBufferToArrayBuffer(buffer);
    const palette = extractTGAPalette(arrayBuffer);

    expect(palette).not.toBeNull();
    if (!palette) return;

    const colors = palette.colors;

    // Color 0 should be white-ish (after color correction)
    expect(colors[0]).toBeGreaterThan(240);
    expect(colors[1]).toBeGreaterThan(240);
    expect(colors[2]).toBeGreaterThan(240);

    // Color 255 should be black
    const lastIdx = 255 * 4;
    expect(colors[lastIdx]).toBe(0);
    expect(colors[lastIdx + 1]).toBe(0);
    expect(colors[lastIdx + 2]).toBe(0);
  });

  it("border.tga palette matches game data border.tga", () => {
    const gameDir = join(
      process.cwd(),
      "..",
      "games",
      "mightymike",
      "Data",
      "Images",
    );
    if (!existsSync(join(gameDir, "border.tga"))) {
      return; // Skip if game submodule not available
    }

    const editorBuffer = readFileSync(join(terrainDir, "border.tga"));
    const gameBuffer = readFileSync(join(gameDir, "border.tga"));

    const editorPalette = extractTGAPalette(
      nodeBufferToArrayBuffer(editorBuffer),
    );
    const gamePalette = extractTGAPalette(nodeBufferToArrayBuffer(gameBuffer));

    expect(editorPalette).not.toBeNull();
    expect(gamePalette).not.toBeNull();
    if (!editorPalette || !gamePalette) return;

    for (let i = 0; i < 256 * 4; i++) {
      expect(editorPalette.colors[i]).toBe(gamePalette.colors[i]);
    }
  });
});
