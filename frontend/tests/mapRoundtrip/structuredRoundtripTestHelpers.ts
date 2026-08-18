import { expect } from "vitest";
import {
  loadBytesFromJsonAsync,
  saveToJson,
} from "@lachlanbwwright/rsrcdump-ts";
import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.unknown());

function parseJsonObject(json: string): z.infer<typeof jsonObjectSchema> {
  const parsed: unknown = JSON.parse(json);
  const result = jsonObjectSchema.safeParse(parsed);
  expect(result.success).toBe(true);
  return result.success ? result.data : {};
}

const coreStructuredResourceTypes = new Set([
  "Hedr",
  "Layr",
  "YCrd",
  "STgd",
  "Itms",
]);

function coreStructuredResources(
  json: z.infer<typeof jsonObjectSchema>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(json)
      .filter(([type]) => coreStructuredResourceTypes.has(type))
      .map(([type, resources]) => {
        const parsedResources = jsonObjectSchema.safeParse(resources);
        if (!parsedResources.success) return [type, undefined];

        const objects = Object.entries(parsedResources.data).map(
          ([id, resource]) => {
            const parsedResource = jsonObjectSchema.safeParse(resource);
            return [
              id,
              parsedResource.success ? parsedResource.data.obj : undefined,
            ];
          },
        );
        return [type, Object.fromEntries(objects)];
      }),
  );
}

export async function expectStructuredRoundtrip(
  originalData: Uint8Array,
  specs: string[],
): Promise<void> {
  const firstJsonResult = await saveToJson(originalData, specs, [], []);
  expect(firstJsonResult.ok).toBe(true);
  if (!firstJsonResult.ok) return;
  const firstJson = parseJsonObject(firstJsonResult.value);

  const bytesResult = await loadBytesFromJsonAsync(firstJson, specs, [], []);
  expect(bytesResult.ok).toBe(true);
  if (!bytesResult.ok) return;

  const secondJsonResult = await saveToJson(bytesResult.value, specs, [], []);
  expect(secondJsonResult.ok).toBe(true);
  if (!secondJsonResult.ok) return;
  const secondJson = parseJsonObject(secondJsonResult.value);

  expect(Object.keys(secondJson).sort()).toEqual(Object.keys(firstJson).sort());
  expect(coreStructuredResources(secondJson)).toEqual(
    coreStructuredResources(firstJson),
  );
}
