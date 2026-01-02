/**
 * Quick analysis script for Grasshopper.bg3d
 * Run with: npx tsx src/modelParsers/analyzeGrasshopper.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parseBG3D } from "./parseBG3D";
import { isErr } from "../types/result";

const GRASSHOPPER_PATH = path.join(
  __dirname,
  "./testSkeletons/Grasshopper.bg3d",
);

function analyzeFile() {
  console.log("Analyzing Grasshopper.bg3d");
  console.log("==========================\n");

  if (!fs.existsSync(GRASSHOPPER_PATH)) {
    console.log(`❌ File not found: ${GRASSHOPPER_PATH}`);
    return;
  }

  // Read the raw bytes
  const buffer = fs.readFileSync(GRASSHOPPER_PATH);
  console.log(`File size: ${buffer.length} bytes`);

  // Print first 100 bytes as hex
  console.log("\nFirst 100 bytes (hex):");
  const hexBytes = [];
  for (let i = 0; i < Math.min(100, buffer.length); i++) {
    hexBytes.push(buffer[i]?.toString(16).padStart(2, "0") ?? "00");
  }
  console.log(hexBytes.join(" "));

  // Check for BG3D header
  const headerMagic = buffer.slice(0, 4).toString("ascii");
  console.log(
    `\nHeader magic: "${headerMagic}" (${buffer.slice(0, 4).toString("hex")})`,
  );

  // Parse the file using the parser
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  const result = parseBG3D(arrayBuffer);
  if (isErr(result)) {
    console.log(`\n❌ Parse error: ${result.error.message}`);
    return;
  }

  const parsed = result.value;
  console.log(`\n✅ Successfully parsed!`);
  console.log(`Materials: ${parsed.materials.length}`);
  console.log(`Groups: ${parsed.groups.length}`);

  // Check for bounding boxes
  let hasBoundingBox = false;
  let geomCount = 0;

  function isRecord(x: unknown): x is Record<string, unknown> {
    return typeof x === "object" && x !== null;
  }

  function inspectGroup(children: unknown[], depth = 0) {
    for (const child of children) {
      if (!isRecord(child)) continue;

      if (Array.isArray(child.children)) {
        inspectGroup(child.children as unknown[], depth + 1);
      } else {
        geomCount++;
        if (child['boundingBox'] !== undefined) {
          hasBoundingBox = true;
          console.log(
            `  Found bounding box in geometry ${geomCount}:`,
            child['boundingBox'],
          );
        }
      }
    }
  }

  for (const group of parsed.groups) {
    inspectGroup(group.children);
  }

  console.log(`\nTotal geometries: ${geomCount}`);
  console.log(`Has BOUNDINGBOX tags: ${hasBoundingBox}`);

  // Determine game
  if (hasBoundingBox) {
    console.log(
      `\n🎮 Game: Most likely BUGDOM 2, Nanosaur 2, or Billy Frontier (later games with bounding boxes)`,
    );
  } else {
    console.log(
      `\n🎮 Game: Most likely Otto Matic or Cro-Mag Rally (earlier games without bounding boxes)`,
    );
  }

  // Additional info
  console.log(`\n--- Material Info ---`);
  for (let i = 0; i < parsed.materials.length; i++) {
    const mat = parsed.materials[i];
    if (!mat) continue;
    console.log(
      `Material ${i}: flags=${mat.flags}, textures=${mat.textures.length}`,
    );
    for (let j = 0; j < mat.textures.length; j++) {
      const tex = mat.textures[j];
      if (!tex) continue;
      console.log(
        `  Texture ${j}: ${tex.width}x${tex.height}, isJpeg=${
          tex.isJpeg || false
        }`,
      );
    }
  }
}

analyzeFile();
