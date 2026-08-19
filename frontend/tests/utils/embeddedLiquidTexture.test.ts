import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { extractEmbeddedTexture } from "@/editor/subviews/water/embeddedLiquidTexture";

const CRO_MAG_GLOBAL_MODEL = resolve(
  import.meta.dirname,
  "../../../games/pangea-ports/games/CroMagRally-Android/Data/Models/global.bg3d",
);

describe("extractEmbeddedTexture", () => {
  it("extracts Cro-Mag's real water texture from material 13", async () => {
    const bytes = await readFile(CRO_MAG_GLOBAL_MODEL);
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    );
    const parsed = parseBG3D(buffer);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;

    const texture = extractEmbeddedTexture(parsed.value, 13);
    expect(texture.isOk()).toBe(true);
    if (texture.isErr()) return;
    expect([texture.value.width, texture.value.height]).toEqual([64, 64]);
    expect(texture.value.srcPixelFormat).toBe(6408);
    expect(texture.value.pixels.byteLength).toBe(64 * 64 * 4);
  });

  it("returns a typed error for an absent material", () => {
    const texture = extractEmbeddedTexture({ materials: [], groups: [] }, 13);
    expect(texture.isErr()).toBe(true);
  });
});
