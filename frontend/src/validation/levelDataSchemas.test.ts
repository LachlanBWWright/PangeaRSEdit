import { describe, it, expect } from "vitest";
import {
  validateLevelData,
  validateHeader,
  validateItems,
  validateFences,
  validateTileAttributes,
  headerFullSchema,
  headerSimplifiedSchema,
  itemSchema,
  fenceSchema,
  tileAttributeSchema,
  ottoMaticLevelSchema,
} from "./levelDataSchemas";
import { isOk, isErr } from "../types/result";

describe("Level Data Zod Schemas", () => {
  describe("headerFullSchema", () => {
    it("should validate a valid full header", () => {
      const header = {
        version: 1,
        numItems: 100,
        mapWidth: 256,
        mapHeight: 256,
        numTilePages: 16,
        numTiles: 1024,
        tileSize: 32,
        minY: 0,
        maxY: 1000,
        numSplines: 5,
        numFences: 10,
        numUniqueSupertiles: 50,
        numWaterPatches: 3,
        numCheckpoints: 2,
      };
      const result = headerFullSchema.safeParse(header);
      expect(result.success).toBe(true);
    });

    it("should fail for missing fields", () => {
      const header = {
        version: 1,
        numItems: 100,
        // missing other required fields
      };
      const result = headerFullSchema.safeParse(header);
      expect(result.success).toBe(false);
    });

    it("should fail for wrong types", () => {
      const header = {
        version: "1", // should be number
        numItems: 100,
        mapWidth: 256,
        mapHeight: 256,
        numTilePages: 16,
        numTiles: 1024,
        tileSize: 32,
        minY: 0,
        maxY: 1000,
        numSplines: 5,
        numFences: 10,
        numUniqueSupertiles: 50,
        numWaterPatches: 3,
        numCheckpoints: 2,
      };
      const result = headerFullSchema.safeParse(header);
      expect(result.success).toBe(false);
    });
  });

  describe("headerSimplifiedSchema", () => {
    it("should validate a valid simplified header (no numTilePages/numTiles)", () => {
      const header = {
        version: 1,
        numItems: 100,
        mapWidth: 256,
        mapHeight: 256,
        tileSize: 32,
        minY: 0,
        maxY: 1000,
        numSplines: 5,
        numFences: 10,
        numUniqueSupertiles: 50,
        numWaterPatches: 3,
        numCheckpoints: 2,
      };
      const result = headerSimplifiedSchema.safeParse(header);
      expect(result.success).toBe(true);
    });
  });

  describe("itemSchema", () => {
    it("should validate a valid item", () => {
      const item = {
        x: 1000,
        z: 2000,
        type: 5,
        flags: 0,
        p0: 1,
        p1: 2,
        p2: 3,
        p3: 4,
      };
      const result = itemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });

    it("should fail for missing fields", () => {
      const item = {
        x: 1000,
        z: 2000,
        type: 5,
        // missing flags, p0, p1, p2, p3
      };
      const result = itemSchema.safeParse(item);
      expect(result.success).toBe(false);
    });
  });

  describe("fenceSchema", () => {
    it("should validate a valid fence", () => {
      const fence = {
        fenceType: 1,
        numNubs: 4,
        junkNubListPtr: 0,
        bbTop: 100,
        bbBottom: 200,
        bbLeft: 50,
        bbRight: 150,
      };
      const result = fenceSchema.safeParse(fence);
      expect(result.success).toBe(true);
    });
  });

  describe("tileAttributeSchema", () => {
    it("should validate a valid tile attribute", () => {
      const attr = {
        flags: 0,
        p0: 1,
        p1: 2,
      };
      const result = tileAttributeSchema.safeParse(attr);
      expect(result.success).toBe(true);
    });
  });

  describe("validation functions with Result type", () => {
    describe("validateHeader", () => {
      it("should return Ok for valid header", () => {
        const header = {
          version: 1,
          numItems: 100,
          mapWidth: 256,
          mapHeight: 256,
          numTilePages: 16,
          numTiles: 1024,
          tileSize: 32,
          minY: 0,
          maxY: 1000,
          numSplines: 5,
          numFences: 10,
          numUniqueSupertiles: 50,
          numWaterPatches: 3,
          numCheckpoints: 2,
        };
        const result = validateHeader(header, false);
        expect(isOk(result)).toBe(true);
      });

      it("should return Err for invalid header", () => {
        const header = { version: "not a number" };
        const result = validateHeader(header, false);
        expect(isErr(result)).toBe(true);
      });
    });

    describe("validateItems", () => {
      it("should return Ok for valid items array", () => {
        const items = [
          { x: 100, z: 200, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
          { x: 300, z: 400, type: 2, flags: 1, p0: 1, p1: 2, p2: 3, p3: 4 },
        ];
        const result = validateItems(items);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.length).toBe(2);
        }
      });

      it("should return Err for invalid items", () => {
        const items = [{ x: "not a number" }]; // invalid item
        const result = validateItems(items);
        expect(isErr(result)).toBe(true);
      });
    });

    describe("validateFences", () => {
      it("should return Ok for valid fences array", () => {
        const fences = [
          {
            fenceType: 1,
            numNubs: 4,
            junkNubListPtr: 0,
            bbTop: 100,
            bbBottom: 200,
            bbLeft: 50,
            bbRight: 150,
          },
        ];
        const result = validateFences(fences);
        expect(isOk(result)).toBe(true);
      });
    });

    describe("validateTileAttributes", () => {
      it("should return Ok for valid tile attributes", () => {
        const attrs = [
          { flags: 0, p0: 1, p1: 2 },
          { flags: 1, p0: 3, p1: 4 },
        ];
        const result = validateTileAttributes(attrs);
        expect(isOk(result)).toBe(true);
      });
    });
  });

  describe("ottoMaticLevelSchema", () => {
    it("should allow passthrough of unknown properties", () => {
      const minimalLevel = {
        _metadata: {
          file_attributes: 0,
          junk1: 0,
          junk2: 0,
        },
        Hedr: {
          "1000": {
            name: "Header",
            obj: {
              version: 1,
              numItems: 0,
              mapWidth: 64,
              mapHeight: 64,
              numTilePages: 1,
              numTiles: 16,
              tileSize: 32,
              minY: 0,
              maxY: 100,
              numSplines: 0,
              numFences: 0,
              numUniqueSupertiles: 1,
              numWaterPatches: 0,
              numCheckpoints: 0,
            },
            order: 0,
          },
        },
        Atrb: {
          "1000": {
            name: "Tile Attribute Data",
            obj: [{ flags: 0, p0: 0, p1: 0 }],
            order: 1,
          },
        },
        ItCo: {
          "1000": {
            name: "Terrain Items Color Array",
            data: "00000000",
            order: 2,
          },
        },
        YCrd: {
          "1000": {
            name: "Floor&Ceiling Y Coords",
            obj: [0, 0, 0, 0],
            order: 3,
          },
        },
        alis: {
          "1000": {
            name: "Texture Page Picture Alias",
            data: "00000000",
            order: 4,
          },
        },
        unknownProperty: "should be allowed", // passthrough
      };

      const result = ottoMaticLevelSchema.safeParse(minimalLevel);
      expect(result.success).toBe(true);
    });
  });
});
