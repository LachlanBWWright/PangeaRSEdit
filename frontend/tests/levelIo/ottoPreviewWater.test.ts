import { readFileSync } from "node:fs";
import { Blob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { parseRsrcLevelFile } from "@/editor/loadLogic/parseRsrcLevelFile";
import { preparePreviewLevelBytes, serializeLevelDownloadBytes } from "@/data/level-io/serializeLevelBytes";

describe("Otto preview water", () => {
  it("preserves edited Earth Farm liquid geometry in preview and downloaded levels", async () => {
    const bytes = readFileSync("public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc");
    const parsed = await parseRsrcLevelFile(new Blob([Uint8Array.from(bytes)]), OttoGlobals, () => undefined);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const original = parsed.value.Liqd?.[1000]?.obj;
    expect(original).toHaveLength(7);
    const first = original?.[0];
    if (!first) return;
    first.nubs[0] = [987, 136];
    const snapshot = structuredClone(parsed.value);
    const exported = await preparePreviewLevelBytes({ levelData: parsed.value, globals: OttoGlobals, mapImages: [] });
    expect(exported.isOk()).toBe(true);
    if (exported.isErr() || !exported.value.rsrcBytes) return;
    const downloaded = await serializeLevelDownloadBytes({ levelData: parsed.value, globals: OttoGlobals, fileName: "EarthFarm", mapImages: [] });
    expect(downloaded.isOk()).toBe(true);
    if (downloaded.isErr()) return;
    const resource = downloaded.value.find((file) => file.extension === ".ter.rsrc");
    expect(resource).toBeDefined();
    if (!resource) return;
    expect(parsed.value).toEqual(snapshot);
    for (const bytes of [exported.value.rsrcBytes, resource.bytes]) {
      const restored = await parseRsrcLevelFile(new Blob([Uint8Array.from(bytes)]), OttoGlobals, () => undefined);
      expect(restored.isOk()).toBe(true);
      if (restored.isErr()) return;
      expect(restored.value.Hedr[1000].obj.numWaterPatches).toBe(7);
      expect(restored.value.Liqd?.[1000]?.obj.map((liquid) => liquid.nubs)).toEqual(original?.map((liquid) => liquid.nubs));
    }
  });
});
