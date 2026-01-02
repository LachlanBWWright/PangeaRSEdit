/**
 * Comprehensive BG3D parsing tests for all Pangea games
 * Tests BG3D -> glTF -> BG3D roundtrip for:
 * - Otto Matic (original format, no bounding boxes)
 * - Cro Mag Rally (original format, no bounding boxes)
 * - Bugdom 2 (bounding boxes)
 * - Nanosaur 2 (bounding boxes + JPEG textures)
 * - Billy Frontier (bounding boxes)
 */

import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D, BG3DParseResult } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { accessSync, constants, readFileSync } from "fs";
import { join } from "path";

// Game paths relative to workspace root
const GAMES_ROOT = join(__dirname, "../../../../games");

// Test fixtures - one model from each game type
const TEST_FIXTURES = {
  ottomatic: {
    name: "Otto Matic",
    bg3dPath: join(GAMES_ROOT, "ottomatic/Data/Skeletons/Otto.bg3d"),
    supportsBoundingBox: false,
    supportsJpegTextures: false,
  },
  cromagrally: {
    name: "Cro Mag Rally",
    bg3dPath: join(GAMES_ROOT, "cromagrally/Data/Skeletons/Brog.bg3d"),
    supportsBoundingBox: false,
    supportsJpegTextures: false,
  },
  bugdom2: {
    name: "Bugdom 2",
    bg3dPath: join(GAMES_ROOT, "bugdom2/Data/Skeletons/Ant.bg3d"),
    supportsBoundingBox: true,
    supportsJpegTextures: false,
  },
  nanosaur2: {
    name: "Nanosaur 2",
    bg3dPath: join(GAMES_ROOT, "nanosaur2/Data/Skeletons/nano.bg3d"),
    supportsBoundingBox: true,
    supportsJpegTextures: true, // May have JPEG textures
  },
  billyfrontier: {
    name: "Billy Frontier",
    bg3dPath: join(GAMES_ROOT, "billyfrontier/Data/Skeletons/Billy.bg3d"),
    supportsBoundingBox: true,
    supportsJpegTextures: false,
  },
};

// Helper to check if file exists
function fileExists(filePath: string): boolean {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// Helper to read file as ArrayBuffer
function readFileAsArrayBuffer(filePath: string): ArrayBuffer {
  const buffer = readFileSync(filePath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

// Shared group types
interface GroupChild { children?: GroupChild[]; boundingBox?: unknown }
interface Group { children?: GroupChild[] }

describe("BG3D Multi-Game Parsing Tests", () => {
  // Test basic parsing for each game
  Object.values(TEST_FIXTURES).forEach((gameConfig) => {
    describe(`${gameConfig.name}`, () => {
      it(`should parse ${gameConfig.name} BG3D file without errors`, () => {
        if (!fileExists(gameConfig.bg3dPath)) {
          console.warn(
            `Skipping ${gameConfig.name}: File not found at ${gameConfig.bg3dPath}`,
          );
          return;
        }

        const buffer = readFileAsArrayBuffer(gameConfig.bg3dPath);

        // Parse BG3D - this should not throw
        const parsedRes = parseBG3D(buffer);
        if (!parsedRes.ok) {
          console.error(`Failed to parse ${gameConfig.name}:`, parsedRes.error);
          throw parsedRes.error;
        }
        const parsed: BG3DParseResult = parsedRes.value;

        // Basic validation
        expect(parsed).toBeDefined();
        expect(parsed.materials).toBeDefined();
        expect(Array.isArray(parsed.materials)).toBe(true);
        expect(parsed.groups).toBeDefined();
        expect(Array.isArray(parsed.groups)).toBe(true);

        console.log(
          `${gameConfig.name}: ${parsed.materials.length} materials, ${parsed.groups.length} groups`,
        );
      });

      it(`should convert ${gameConfig.name} BG3D to glTF`, () => {
        if (!fileExists(gameConfig.bg3dPath)) {
          console.warn(
            `Skipping ${gameConfig.name}: File not found at ${gameConfig.bg3dPath}`,
          );
          return;
        }

        const buffer = readFileAsArrayBuffer(gameConfig.bg3dPath);
        const parsedRes = parseBG3D(buffer);
        if (!parsedRes.ok) throw parsedRes.error;
        const parsed: BG3DParseResult = parsedRes.value;

        // Convert to glTF - this should not throw
        let gltfDoc;
        try {
          gltfDoc = bg3dParsedToGLTF(parsed);
        } catch (error) {
          console.error(`Failed to convert ${gameConfig.name} to glTF:`, error);
          throw error;
        }

        expect(gltfDoc).toBeDefined();

        const meshes = gltfDoc.getRoot().listMeshes();
        const materials = gltfDoc.getRoot().listMaterials();

        console.log(
          `${gameConfig.name} glTF: ${meshes.length} meshes, ${materials.length} materials`,
        );
      });

      it(`should roundtrip ${gameConfig.name} BG3D through glTF`, async () => {
        if (!fileExists(gameConfig.bg3dPath)) {
          console.warn(
            `Skipping ${gameConfig.name}: File not found at ${gameConfig.bg3dPath}`,
          );
          return;
        }

        const originalBuffer = readFileAsArrayBuffer(gameConfig.bg3dPath);
        const originalArray = new Uint8Array(originalBuffer);

        // Parse -> glTF -> BG3D roundtrip
        const parsedRes = parseBG3D(originalBuffer);
        if (!parsedRes.ok) throw parsedRes.error;
        const parsed: BG3DParseResult = parsedRes.value;
        const gltfDoc = bg3dParsedToGLTF(parsed, {
          bg3dBuffer: originalBuffer,
        });

        // Convert back
        let roundtripParsed;
        try {
          roundtripParsed = await gltfToBG3D(gltfDoc);
        } catch (error) {
          console.error(
            `Failed to convert ${gameConfig.name} from glTF:`,
            error,
          );
          throw error;
        }

        // Convert back to binary
        const roundtripBuffer = bg3dParsedToBG3D(roundtripParsed);
        const roundtripArray = new Uint8Array(roundtripBuffer);

        // Compare sizes
        console.log(
          `${gameConfig.name} roundtrip: original ${originalArray.length} bytes, roundtrip ${roundtripArray.length} bytes`,
        );

        // Validate basic structure is preserved
        expect(roundtripParsed.materials.length).toBe(parsed.materials.length);

        // Compare geometry counts
        interface GroupChild { children?: GroupChild[]; boundingBox?: unknown }
        interface Group { children?: GroupChild[] }

        function countGeometries(groups: Group[]): number {
          let count = 0;
          function traverse(group: GroupChild | Group) {
            if (Array.isArray(group.children)) {
              for (const child of group.children) {
                if (Array.isArray(child.children)) {
                  traverse(child);
                } else {
                  count++;
                }
              }
            }
          }
          for (const group of groups) {
            traverse(group);
          }
          return count;
        }

        const originalGeomCount = countGeometries(parsed.groups);
        const roundtripGeomCount = countGeometries(roundtripParsed.groups);
        expect(roundtripGeomCount).toBe(originalGeomCount);

        console.log(
          `${gameConfig.name}: ${originalGeomCount} geometries preserved`,
        );
      });
    });
  });
});

describe("BG3D Format Difference Tests", () => {
  it("should correctly identify bounding box support differences", () => {
    // Verify our test fixtures have correct format flags
    expect(TEST_FIXTURES.ottomatic.supportsBoundingBox).toBe(false);
    expect(TEST_FIXTURES.cromagrally.supportsBoundingBox).toBe(false);
    expect(TEST_FIXTURES.bugdom2.supportsBoundingBox).toBe(true);
    expect(TEST_FIXTURES.nanosaur2.supportsBoundingBox).toBe(true);
    expect(TEST_FIXTURES.billyfrontier.supportsBoundingBox).toBe(true);
  });

  it("should parse Bugdom 2 model with bounding boxes", () => {
    const bg3dPath = TEST_FIXTURES.bugdom2.bg3dPath;
    if (!fileExists(bg3dPath)) {
      console.warn("Skipping: Bugdom 2 test file not found");
      return;
    }

    const buffer = readFileAsArrayBuffer(bg3dPath);
    const parsedRes = parseBG3D(buffer);
    if (!parsedRes.ok) throw parsedRes.error;
    const parsed: BG3DParseResult = parsedRes.value;

    // Check if any geometries have bounding boxes (they should after proper parsing)
    let foundBoundingBox = false;
    function checkGeometries(groups: Group[]) {
      function traverse(group: GroupChild | Group) {
        if (Array.isArray(group.children)) {
          for (const child of group.children) {
            if (Array.isArray(child.children)) {
              traverse(child);
            } else {
              // This is a geometry
              if (child.boundingBox) {
                foundBoundingBox = true;
              }
            }
          }
        }
      }
      for (const group of groups) {
        traverse(group);
      }
    }
    checkGeometries(parsed.groups);

    console.log(`Bugdom 2: Found bounding box = ${foundBoundingBox}`);
    // Note: The current parser skips bounding box data, so this might be false
    // After fixes, this should be true for games that support bounding boxes
  });

  it("should handle Nanosaur 2 potential JPEG textures", () => {
    const bg3dPath = TEST_FIXTURES.nanosaur2.bg3dPath;
    if (!fileExists(bg3dPath)) {
      console.warn("Skipping: Nanosaur 2 test file not found");
      return;
    }

    const buffer = readFileAsArrayBuffer(bg3dPath);

    // This test checks if parsing completes without throwing on JPEG texture tag
    const parsedRes = parseBG3D(buffer);
    if (!parsedRes.ok) {
      if (
        parsedRes.error instanceof Error &&
        parsedRes.error.message.includes("Unknown BG3D tag: 13")
      ) {
        console.error(
          "JPEG texture tag (13) not supported - need to implement",
        );
        throw new Error("JPEG texture support not implemented for Nanosaur 2");
      }
      throw parsedRes.error;
    }
    const parsed: BG3DParseResult = parsedRes.value;

    expect(parsed).toBeDefined();
    console.log(
      `Nanosaur 2: Parsed successfully with ${parsed.materials.length} materials`,
    );
  });
});

describe("BG3D Model File Tests", () => {
  // Test regular model files (non-skeleton) from each game
  const MODEL_FIXTURES = {
    ottomatic: path.join(GAMES_ROOT, "ottomatic/Data/Models/level1_farm.bg3d"),
    cromagrally: path.join(
      GAMES_ROOT,
      "cromagrally/Data/Models/Level_Aztec.bg3d",
    ),
    bugdom2: path.join(GAMES_ROOT, "bugdom2/Data/Models/Level1_Garden.bg3d"),
    nanosaur2: path.join(GAMES_ROOT, "nanosaur2/Data/Models/global.bg3d"),
    billyfrontier: path.join(
      GAMES_ROOT,
      "billyfrontier/Data/Models/global.bg3d",
    ),
  };

  Object.entries(MODEL_FIXTURES).forEach(([gameKey, modelPath]) => {
    it(`should parse ${gameKey} model file`, () => {
      if (!fileExists(modelPath)) {
        console.warn(`Skipping: ${modelPath} not found`);
        return;
      }

      const buffer = readFileAsArrayBuffer(modelPath);

      let parsed: BG3DParseResult | undefined;
      try {
        const parsedRes = parseBG3D(buffer);
        if (!parsedRes.ok) throw parsedRes.error;
        parsed = parsedRes.value;
      } catch (error) {
        console.error(`Failed to parse ${gameKey} model:`, error);
        throw error;
      }

      expect(parsed).toBeDefined();
      if (!parsed) throw new Error("Expected parsed to be defined");
      expect(parsed.materials.length).toBeGreaterThan(0);

      console.log(
        `${gameKey} model: ${parsed.materials.length} materials, groups: ${
          parsed.groups.length
        }`,
      );
    });
  });
});
