import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { parseMightyMikeMap } from "./parseMightyMike";

const terrainDirectory = join(
  import.meta.dirname,
  "../../public/assets/mightyMike/terrain",
);

const sceneDefinitions = [
  {
    name: "jurassic",
    types: [0, 4, 5, 6, 7, 8, 9, 31],
  },
  {
    name: "candy",
    types: [21, 22, 24, 25, 26, 28, 32, 35, 36],
  },
  {
    name: "fairy",
    types: [37, 38, 39, 40, 41, 42, 44, 46],
  },
  {
    name: "clown",
    types: [11, 12, 13, 14, 16, 17, 20, 23],
  },
  {
    name: "bargain",
    types: [18, 45, 47, 48, 49, 50, 51, 52, 53, 54],
  },
] as const;

function readMap(sceneName: string, areaNumber: number): ArrayBuffer {
  const bytes = readFileSync(
    join(terrainDirectory, `${sceneName}.map-${areaNumber}`),
  );
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

describe("Mighty Mike scripting map fixtures", () => {
  it("covers every shipped scene and area with valid map-item contexts", () => {
    for (const scene of sceneDefinitions) {
      for (let areaNumber = 1; areaNumber <= 3; areaNumber += 1) {
        const result = parseMightyMikeMap(readMap(scene.name, areaNumber));
        expect(result.isOk()).toBe(true);
        if (result.isErr()) continue;

        expect(result.value.items.length).toBeGreaterThan(0);
        expect(result.value.items).toHaveLength(result.value.numItems);
        for (const item of result.value.items) {
          expect(item.type).toBeGreaterThanOrEqual(0);
          expect(item.type).toBeLessThanOrEqual(55);
          expect([item.p0, item.p1, item.p2, item.p3]).toHaveLength(4);
        }

        const itemTypes = new Set(
          result.value.items.map((item) => item.type),
        );
        expect(
          scene.types.some((itemType) => itemTypes.has(itemType)),
        ).toBe(true);
      }
    }
  });
});
