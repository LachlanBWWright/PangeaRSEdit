/**
 * Manual test script to verify BG3D parsing for all games
 * Run with: npx tsx src/modelParsers/testAllGamesManual.ts
 */

import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import * as fs from "fs";
import * as path from "path";

const GAMES_ROOT = path.join(__dirname, "../../../../games");

const TEST_FILES = [
  {
    game: "Otto Matic",
    path: path.join(GAMES_ROOT, "ottomatic/Data/Skeletons/Otto.bg3d"),
  },
  {
    game: "Cro Mag Rally",
    path: path.join(GAMES_ROOT, "cromagrally/Data/Skeletons/Brog.bg3d"),
  },
  {
    game: "Bugdom 2",
    path: path.join(GAMES_ROOT, "bugdom2/Data/Skeletons/Ant.bg3d"),
  },
  {
    game: "Nanosaur 2",
    path: path.join(GAMES_ROOT, "nanosaur2/Data/Skeletons/nano.bg3d"),
  },
  {
    game: "Billy Frontier",
    path: path.join(GAMES_ROOT, "billyfrontier/Data/Skeletons/Billy.bg3d"),
  },
];

async function testGame(game: string, filePath: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${game}`);
  console.log(`File: ${filePath}`);
  console.log("=".repeat(60));

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return { game, success: false, error: "File not found" };
  }

  try {
    // Read file
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    // Parse BG3D
    console.log("Parsing BG3D...");
    const parsed = parseBG3D(arrayBuffer);
    if (!parsed.ok) {
      console.error(
        `❌ Parse failed: ${parsed.error?.message ?? String(parsed.error)}`,
      );
      return {
        game,
        success: false,
        error: parsed.error?.message ?? String(parsed.error),
      };
    }
    const parsedValue = parsed.value;
    console.log(`✅ Parsed: ${parsedValue.materials.length} materials`);

    // Count geometries
    let geomCount = 0;
    let hasBoundingBox = false;
    type GroupChild = { children?: GroupChild[]; boundingBox?: unknown };
    function countGeoms(groups: GroupChild[]) {
      for (const group of groups) {
        if (Array.isArray(group.children)) {
          for (const child of group.children) {
            if (Array.isArray(child.children)) {
              countGeoms([child]);
            } else {
              geomCount++;
              if (child.boundingBox) hasBoundingBox = true;
            }
          }
        }
      }
    }
    countGeoms(parsedValue.groups);
    console.log(`✅ ${geomCount} geometries, bounding box: ${hasBoundingBox}`);

    // Convert to glTF
    console.log("Converting to glTF...");
    const gltfDoc = bg3dParsedToGLTF(parsedValue, { bg3dBuffer: arrayBuffer });
    console.log(`✅ glTF: ${gltfDoc.getRoot().listMeshes().length} meshes`);

    // Convert back to BG3D
    console.log("Converting back to BG3D...");
    const roundtripParsed = await gltfToBG3D(gltfDoc);
    console.log(`✅ Roundtrip: ${roundtripParsed.materials.length} materials`);

    // Binary roundtrip
    console.log("Binary roundtrip...");
    const roundtripBuffer = bg3dParsedToBG3D(roundtripParsed);
    console.log(
      `✅ Binary: ${roundtripBuffer.byteLength} bytes (original: ${arrayBuffer.byteLength})`,
    );

    return { game, success: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(error.stack);
      return { game, success: false, error: error.message };
    } else {
      const message = String(error);
      console.log(`❌ Error: ${message}`);
      return { game, success: false, error: message };
    }
  }
}

async function main() {
  console.log("BG3D Multi-Game Parser Test");
  console.log("============================\n");

  const results = [];
  for (const { game, path: filePath } of TEST_FILES) {
    results.push(await testGame(game, filePath));
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  let passed = 0;
  let failed = 0;
  for (const result of results) {
    if (result.success) {
      console.log(`✅ ${result.game}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${result.game}: FAILED - ${result.error}`);
      failed++;
    }
  }
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
}

main().catch(console.error);
