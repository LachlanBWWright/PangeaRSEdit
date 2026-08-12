import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadBytesFromJsonAsync, saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { croMagSpecs } from "@/python/structSpecs/croMag";
import { croMagLevelSchema } from "@/validation/games/croMag";

describe("Cro-Mag racing resources", () => {
  it("parses and structurally round-trips paths, points, and checkpoints", async () => {
    const bytes = readFileSync(
      join(process.cwd(), "public/assets/croMag/terrain/StoneAge_Desert.ter.rsrc"),
    );
    const parsedJson = await saveToJson(new Uint8Array(bytes), croMagSpecs, [], []);
    expect(parsedJson.ok).toBe(true);
    if (!parsedJson.ok) return;

    const validated = croMagLevelSchema.safeParse(JSON.parse(parsedJson.value));
    expect(validated.success).toBe(true);
    if (!validated.success) return;
    const level = validated.data;
    const numPaths = level.Hedr[1000]?.obj.numPaths;
    expect(numPaths).toBeDefined();
    if (numPaths === undefined) return;
    expect(level.Path?.[1000]?.obj.length).toBe(numPaths);
    expect(Object.keys(level.PaPt ?? {})).toHaveLength(numPaths);
    expect(level.CkPt?.[1000]?.obj.length).toBe(level.Hedr[1000]?.obj.numCheckpoints);

    const serialized = await loadBytesFromJsonAsync(level, croMagSpecs, [], []);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok) return;
    const reparsedJson = await saveToJson(serialized.value, croMagSpecs, [], []);
    expect(reparsedJson.ok).toBe(true);
    if (!reparsedJson.ok) return;
    const reparsed = croMagLevelSchema.safeParse(JSON.parse(reparsedJson.value));
    expect(reparsed.success).toBe(true);
    if (!reparsed.success) return;
    expect(reparsed.data.Path).toEqual(level.Path);
    expect(reparsed.data.PaPt).toEqual(level.PaPt);
    expect(reparsed.data.CkPt).toEqual(level.CkPt);
  });
});
