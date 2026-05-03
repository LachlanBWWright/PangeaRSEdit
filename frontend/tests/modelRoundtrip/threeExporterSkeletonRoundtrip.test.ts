import { describe, expect, it } from "vitest";
import { NodeIO } from "@gltf-transform/core";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseBG3D } from "@/modelParsers/parseBG3D";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { normalizeGlbBuffer } from "@/modelParsers/gltfAnimationEvents";
import { prepareSceneForAnimationExport } from "@/pages/ModelViewer/utils/prepareSceneForAnimationExport";

function bufferFromFile(filePath: string): ArrayBuffer {
  const buf = readFileSync(filePath);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

const BG3D_PATH = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Otto.bg3d",
);
const SKEL_PATH = join(
  __dirname,
  "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
);
const itWithOttoFiles = existsSync(BG3D_PATH) && existsSync(SKEL_PATH) ? it : it.skip;

async function loadThreeGltf(buffer: ArrayBuffer) {
  const loader = new GLTFLoader();
  return await new Promise<GLTF>((resolve, reject) => {
    loader.parse(buffer, "", resolve, reject);
  });
}

async function exportThreeScene(
  scene: Parameters<GLTFExporter["parse"]>[0],
  animations: NonNullable<Parameters<GLTFExporter["parse"]>[3]>["animations"],
): Promise<ArrayBuffer> {
  const exporter = new GLTFExporter();
  return await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(result);
          return;
        }
        reject(new Error("Expected GLB bytes from GLTFExporter"));
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
      {
        binary: true,
        embedImages: true,
        animations,
      },
    );
  });
}

describe("Three.js exporter skeleton roundtrip", () => {
  itWithOttoFiles("preserves correct parent bone indices after the edited-export GLTFExporter path", async () => {
    const skeleton = await parseSkeletonRsrc(bufferFromFile(SKEL_PATH));
    const parsedResult = parseBG3D(bufferFromFile(BG3D_PATH), skeleton);
    if (parsedResult.isErr()) {
      expect.fail(`Failed to parse Otto skeleton input: ${parsedResult.error}`);
    }
    const parsed = parsedResult.value;
    expect(parsed.skeleton).toBeTruthy();
    if (!parsed.skeleton) {
      expect.fail("Expected Otto input skeleton to be present");
    }
    const originalSkeleton = parsed.skeleton;

    const io = new NodeIO();
    const sourceDoc = bg3dParsedToGLTF(parsed);
    const sourceGlb = await io.writeBinary(sourceDoc);

    const threeGltf = await loadThreeGltf(toArrayBuffer(sourceGlb));
    const exportScene = prepareSceneForAnimationExport(threeGltf.scene);
    const exportedGlb = await exportThreeScene(exportScene, threeGltf.animations);
    const normalizedGlb = await normalizeGlbBuffer(exportedGlb);
    const readDoc = await io.readBinary(new Uint8Array(normalizedGlb));

    const readSkin = readDoc.getRoot().listSkins()[0];
    expect(readSkin?.getSkeleton()?.getName()).toBe("Pelvis");

    const roundtripped = await gltfToBG3D(readDoc);
    expect(roundtripped.materials.length).toBeGreaterThan(0);
    expect(roundtripped.skeleton).toBeTruthy();
    if (!roundtripped.skeleton) {
      expect.fail("Expected GLTFExporter roundtrip skeleton to be present");
    }
    const roundtrippedSkeleton = roundtripped.skeleton;

    const pelvis = roundtrippedSkeleton.bones.find((bone) => bone.name === "Pelvis");
    const torso = roundtrippedSkeleton.bones.find((bone) => bone.name === "Torso");
    const rightHip = roundtrippedSkeleton.bones.find((bone) => bone.name === "RightHip");
    const leftHip = roundtrippedSkeleton.bones.find((bone) => bone.name === "LeftHip");

    expect(pelvis?.parentBone).toBe(-1);
    expect(torso?.parentBone).toBe(0);
    expect(rightHip?.parentBone).toBe(0);
    expect(leftHip?.parentBone).toBe(0);
    expect(roundtrippedSkeleton.bones).toHaveLength(originalSkeleton.bones.length);
  });
});
