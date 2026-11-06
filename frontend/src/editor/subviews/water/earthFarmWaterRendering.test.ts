import { readFileSync } from "node:fs";
import { join } from "node:path";
import { saveToJson } from "@lachlanbwwright/rsrcdump-ts";
import { expect, it, vi } from "vitest";
import { Result } from "neverthrow";
import { OttoGlobals } from "@/data/globals/globals";
import { ottoMaticSpecs } from "@/python/structSpecs/ottoMatic";
import { preprocessJson } from "@/data/processors/ottoPreprocessor";
import { recordSchema } from "@/schemas/common";
import { isLevelDataLike, splitLevelData } from "@/data/utils/levelDataUtils";
import { buildLiquidBodyCanvas } from "./liquidRenderingUtils";

it("renders a textured fill for every Earth Farm water body", async () => {
  const bytes = readFileSync(join(import.meta.dirname, "../../../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc"));
  const parsed = await saveToJson(new Uint8Array(bytes), ottoMaticSpecs, [], []);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) return;
  const decoded = Result.fromThrowable((): unknown => JSON.parse(parsed.value), () => "Invalid level JSON")();
  expect(decoded.isOk()).toBe(true);
  if (decoded.isErr()) return;
  const validated = recordSchema.safeParse(decoded.value);
  expect(validated.success).toBe(true);
  if (!validated.success) return;
  const json = validated.data;
  expect(preprocessJson(json, OttoGlobals).isOk()).toBe(true);
  if (!isLevelDataLike(json)) { expect.fail("Invalid Earth Farm level"); return; }
  const { headerData, terrainData, liquidData } = splitLevelData(json);
  if (!headerData || !terrainData || !liquidData) { expect.fail("Missing Earth Farm data"); return; }
  const texture = document.createElement("canvas");
  texture.width = 32;
  texture.height = 32;
  const fill = vi.spyOn(CanvasRenderingContext2D.prototype, "fillRect");
  const coverage = liquidData.Liqd[1000].obj.map((body, index) => {
    fill.mockClear();
    buildLiquidBodyCanvas(OttoGlobals, headerData, terrainData, body, texture);
    return { index, filledCells: fill.mock.calls.length - 1 };
  });
  fill.mockRestore();
  expect(coverage.filter((body) => body.filledCells <= 0)).toEqual([]);
});
