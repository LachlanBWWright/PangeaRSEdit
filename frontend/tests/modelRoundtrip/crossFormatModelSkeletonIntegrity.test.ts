import { NodeIO } from "@gltf-transform/core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bg3dParsedToBG3D,
  parseBG3D,
  type BG3DGeometry,
  type BG3DGroup,
  type BG3DParseResult,
  type BG3DSkeleton,
} from "@/modelParsers/parseBG3D";
import { bg3dParsedTo3DMF } from "@/modelParsers/parse3dmf";
import { parseBG3DWithSkeletonResource } from "@/modelParsers/bg3dWithSkeleton";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { bg3dSkeletonToSkeletonResource } from "@/modelParsers/skeletonExport";
import { skeletonResourceToBinary } from "@/modelParsers/skeletonBinaryExport";
import { parseSkeletonRsrc } from "@/modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { eulerToQuaternion } from "@/modelParsers/rotationUtils";

interface ModelPayload {
  geometries: Array<{
    colors: number[][];
    materials: Array<{
      diffuseColor: number[];
      flags: number;
      textureDimensions: Array<[number, number]>;
    }>;
    normals: number[][];
    triangles: number[][];
    uvs: number[][];
    vertices: number[][];
  }>;
}

interface SkeletonPayload {
  bones: Array<{
    coordinates: number[];
    name: string;
    pointAttachments: number[];
    parent: number;
  }>;
  animations: Array<{
    events: Array<[number, number, number]>;
    keyframes: Array<[string, number[][]]>;
    name: string;
  }>;
  relativePoints: Array<[string, number[][]]>;
}

interface CrossFormatFixture {
  label: string;
  model: string;
  skeleton: string;
  sourceFormat: "bg3d" | "3dmf";
}

const gamesRoot = join(__dirname, "../../public/games");
const fixtures: CrossFormatFixture[] = [
  {
    label: "BG3D source",
    model: join(gamesRoot, "bugdom2/skeletons/Ant.bg3d"),
    skeleton: join(gamesRoot, "bugdom2/skeletons/Ant.skeleton.rsrc"),
    sourceFormat: "bg3d",
  },
  {
    label: "3DMF source",
    model: join(gamesRoot, "bugdom1/skeletons/Ant.3dmf"),
    skeleton: join(gamesRoot, "bugdom1/skeletons/Ant.skeleton.rsrc"),
    sourceFormat: "3dmf",
  },
];

function readArrayBuffer(path: string): ArrayBuffer {
  const bytes = readFileSync(path);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function rounded(value: number): number {
  const result = Math.round(value * 100) / 100;
  return Object.is(result, -0) ? 0 : result;
}

function roundedRows(rows: number[][] | undefined): number[][] {
  return (rows ?? []).map((row) => row.map(rounded));
}

function sortedUnique(values: number[] | undefined): number[] {
  return [...new Set(values ?? [])].sort((left, right) => left - right);
}

function rotationQuaternion(x: number, y: number, z: number): number[] {
  const quaternion = eulerToQuaternion(x, y, z);
  const sign = (quaternion[3] ?? 0) < 0 ? -1 : 1;
  return quaternion.map((value) => rounded(value * sign));
}

function collectGeometry(
  groups: BG3DGroup[],
  geometries: ModelPayload["geometries"],
  parsed: BG3DParseResult,
): void {
  for (const group of groups) {
    for (const child of group.children) {
      if (!("numPoints" in child)) {
        collectGeometry([child], geometries, parsed);
        continue;
      }
      geometries.push(geometryPayload(child, parsed));
    }
  }
}

function geometryPayload(
  geometry: BG3DGeometry,
  parsed: BG3DParseResult,
): ModelPayload["geometries"][number] {
  return {
    colors: roundedRows(geometry.colors),
    materials: geometry.layerMaterialNum
      .slice(0, geometry.numMaterials)
      .flatMap((materialIndex) => {
      const material = parsed.materials[materialIndex];
      return material
        ? [{
            diffuseColor: material.diffuseColor.map(rounded),
            flags: material.flags & ~2,
            textureDimensions: material.textures.map((texture) => [
              texture.width,
              texture.height,
            ]),
          }]
        : [];
      }),
    normals: roundedRows(geometry.normals),
    triangles: geometry.triangles ?? [],
    uvs: roundedRows(geometry.uvs),
    vertices: roundedRows(geometry.vertices),
  };
}

function modelPayload(parsed: BG3DParseResult): ModelPayload {
  const geometries: ModelPayload["geometries"] = [];
  collectGeometry(parsed.groups, geometries, parsed);
  return { geometries };
}

function keyframeRows(skeleton: BG3DSkeleton): SkeletonPayload["animations"] {
  return skeleton.animations.map((animation) => ({
    events: animation.events.map((event) => [
      rounded(event.time),
      event.type,
      event.value,
    ]),
    keyframes: Object.entries(animation.keyframes)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([bone, frames]) => [
        bone,
        frames.map((frame) => [
            frame.tick,
            frame.accelerationMode,
            frame.coordX,
            frame.coordY,
            frame.coordZ,
            ...rotationQuaternion(
              frame.rotationX,
              frame.rotationY,
              frame.rotationZ,
            ),
            frame.scaleX,
            frame.scaleY,
            frame.scaleZ,
          ].map(rounded)),
      ]),
    name: animation.name,
  }));
}

function skeletonPayload(skeleton: BG3DSkeleton): SkeletonPayload {
  return {
    bones: skeleton.bones.map((bone) => ({
      coordinates: [bone.coordX, bone.coordY, bone.coordZ].map(rounded),
      name: bone.name,
      pointAttachments: sortedUnique(bone.pointIndices),
      parent: bone.parentBone,
    })),
    animations: keyframeRows(skeleton),
    relativePoints: Object.entries(skeleton.relPoints ?? {})
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([resourceId, points]) => [resourceId, roundedRows(points)]),
  };
}

function expectPayloadIntegrity(
  baselineModel: ModelPayload,
  baselineSkeleton: SkeletonPayload,
  actual: BG3DParseResult,
): void {
  expect(modelPayload(actual)).toEqual(baselineModel);
  expect(actual.skeleton).toBeDefined();
  if (actual.skeleton) {
    const actualSkeleton = skeletonPayload(actual.skeleton);
    expect({
      ...actualSkeleton,
      relativePoints: baselineSkeleton.relativePoints,
    }).toEqual(baselineSkeleton);
    for (const [resourceId, points] of baselineSkeleton.relativePoints) {
      expect(
        actualSkeleton.relativePoints.find(([id]) => id === resourceId)?.[1],
      ).toEqual(points);
    }
  }
}

async function throughGlb(parsed: BG3DParseResult): Promise<BG3DParseResult> {
  const io = new NodeIO();
  const bytes = await io.writeBinary(bg3dParsedToGLTF(parsed));
  return gltfToBG3D(await io.readBinary(bytes));
}

async function exportedSkeleton(parsed: BG3DParseResult) {
  if (!parsed.skeleton) expect.fail("Expected skeletal data");
  const binary = skeletonResourceToBinary(
    bg3dSkeletonToSkeletonResource(parsed.skeleton),
  );
  if (binary.isErr()) expect.fail(binary.error);
  return parseSkeletonRsrc(binary.value);
}

async function throughBg3d(parsed: BG3DParseResult): Promise<BG3DParseResult> {
  const result = parseBG3D(
    bg3dParsedToBG3D(parsed),
    await exportedSkeleton(parsed),
  );
  if (result.isErr()) expect.fail(result.error);
  return result.value;
}

async function through3Dmf(parsed: BG3DParseResult): Promise<BG3DParseResult> {
  const binary = bg3dParsedTo3DMF(parsed);
  if (binary.isErr()) expect.fail(binary.error);
  const result = parseBG3DWithSkeletonResource(
    binary.value,
    await exportedSkeleton(parsed),
  );
  if (result.isErr()) expect.fail(result.error);
  return result.value;
}

describe.each(fixtures)("cross-format model and skeleton integrity: $label", (fixture) => {
  it("preserves payloads through GLB, BG3D, and 3DMF", async () => {
    const resource = await parseSkeletonRsrc(readArrayBuffer(fixture.skeleton));
    const source = fixture.sourceFormat === "bg3d"
      ? parseBG3D(readArrayBuffer(fixture.model), resource)
      : parseBG3DWithSkeletonResource(readArrayBuffer(fixture.model), resource);
    if (source.isErr()) expect.fail(source.error);
    if (!source.value.skeleton) expect.fail("Fixture has no skeletal data");

    const baselineModel = modelPayload(source.value);
    const baselineSkeleton = skeletonPayload(source.value.skeleton);
    const glb = await throughGlb(source.value);
    expectPayloadIntegrity(baselineModel, baselineSkeleton, glb);

    const bg3d = await throughBg3d(glb);
    expectPayloadIntegrity(baselineModel, baselineSkeleton, bg3d);

    const threeDmf = await through3Dmf(bg3d);
    expectPayloadIntegrity(baselineModel, baselineSkeleton, threeDmf);
  });
});
