import { z } from "zod";
import { validateLevelData } from "../levelDataSchemas";

// Mighty Mike level data schema
// Mighty Mike uses a simplified structure converted to Otto Matic format
export const mightyMikeLevelSchema = z.object({
  Hedr: z.object({
    1000: z.object({
      name: z.string().optional(),
      obj: z.object({
        version: z.number().optional(),
        numItems: z.number(),
        mapWidth: z.number(),
        mapHeight: z.number(),
        numTilePages: z.number().optional(),
        numTiles: z.number().optional(),
        tileSize: z.number().optional(),
        minY: z.number().optional(),
        maxY: z.number().optional(),
        numSplines: z.number().optional(),
        numFences: z.number().optional(),
        numUniqueSupertiles: z.number().optional(),
        numWaterPatches: z.number().optional(),
        numCheckpoints: z.number().optional(),
      }),
      order: z.number().optional(),
    }),
  }),
  Layr: z.object({
    1000: z.object({
      name: z.string().optional(),
      obj: z.array(z.number()),
      order: z.number().optional(),
    }),
  }),
  YCrd: z.object({
    1000: z.object({
      name: z.string().optional(),
      obj: z.array(z.number()),
      order: z.number().optional(),
    }),
  }),
  Itms: z.object({
    1000: z.object({
      name: z.string().optional(),
      obj: z.array(z.object({
        x: z.number(),
        z: z.number(),
        type: z.number(),
        p0: z.number(),
        p1: z.number(),
        p2: z.number(),
        p3: z.number(),
        flags: z.number().optional(),
      })),
      order: z.number().optional(),
    }),
  }),
  // Optional tileset data
  tileset: z.object({
    numTileDefinitions: z.number(),
    numXlateEntries: z.number(),
    numTileAttributeEntries: z.number(),
    numTileAnims: z.number(),
    numTileXparentColors: z.number(),
    xlateTable: z.array(z.number()),
    tileAttributes: z.array(z.object({
      flags: z.number(),
      p0: z.number(),
      p1: z.number(),
      p2: z.number(),
      p3: z.number(),
      p4: z.number(),
    })),
    tileAnimations: z.array(z.object({
      name: z.string(),
      speed: z.number(),
      baseTile: z.number(),
      numFrames: z.number(),
      tileNums: z.array(z.number()),
    })),
    transparencyColors: z.array(z.number()),
  }).optional(),
});

export type MightyMikeLevelData = z.infer<typeof mightyMikeLevelSchema>;

export function validateMightyMikeLevel(data: unknown) {
  return validateLevelData<MightyMikeLevelData>(data, mightyMikeLevelSchema);
}
