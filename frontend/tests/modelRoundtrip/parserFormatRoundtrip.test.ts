import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bg3dParsedToBG3D,
  parseBG3D,
  type BG3DGeometry,
  type BG3DGroup,
  type BG3DParseResult,
} from "@/modelParsers/parseBG3D";
import {
  bg3dParsedTo3DMF,
  parse3DMF,
  parse3DMFNative,
  write3DMFNative,
} from "@/modelParsers/parse3dmf";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";

interface GeometrySummary {
  geometries: number;
  points: number;
  triangles: number;
  normals: number;
  uvs: number;
  colors: number;
}

interface Fixture {
  label: string;
  path: string;
}

const gamesRoot = join(__dirname, "../../public/games");

const bg3dFixtures: Fixture[] = [
  {
    label: "legacy BG3D",
    path: join(gamesRoot, "ottomatic/skeletons/Blob.bg3d"),
  },
  {
    label: "BG3D with bounding boxes",
    path: join(gamesRoot, "bugdom2/skeletons/BuddyBug.bg3d"),
  },
  {
    label: "BG3D with JPEG texture support",
    path: join(gamesRoot, "nanosaur2/models/levelintro.bg3d"),
  },
];

const threeDmfFixtures: Fixture[] = [
  {
    label: "small skeleton mesh",
    path: join(gamesRoot, "bugdom1/skeletons/Foot.3dmf"),
  },
  {
    label: "textured skeleton mesh",
    path: join(gamesRoot, "bugdom1/skeletons/Ant.3dmf"),
  },
  {
    label: "multi-model scene",
    path: join(gamesRoot, "nanosaur1/models/Infobar_Models.3dmf"),
  },
];

function readArrayBuffer(path: string): ArrayBuffer {
  const bytes = readFileSync(path);
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );
}

function addGeometry(summary: GeometrySummary, geometry: BG3DGeometry): void {
  summary.geometries += 1;
  summary.points += geometry.numPoints;
  summary.triangles += geometry.numTriangles;
  summary.normals += geometry.normals?.length ?? 0;
  summary.uvs += geometry.uvs?.length ?? 0;
  summary.colors += geometry.colors?.length ?? 0;
}

function addGroup(summary: GeometrySummary, group: BG3DGroup): void {
  for (const child of group.children) {
    if ("numPoints" in child) {
      addGeometry(summary, child);
    } else {
      addGroup(summary, child);
    }
  }
}

function summarizeGeometry(parsed: BG3DParseResult): GeometrySummary {
  const summary: GeometrySummary = {
    geometries: 0,
    points: 0,
    triangles: 0,
    normals: 0,
    uvs: 0,
    colors: 0,
  };
  for (const group of parsed.groups) addGroup(summary, group);
  return summary;
}

async function roundtripThroughGlb(
  parsed: BG3DParseResult,
): Promise<BG3DParseResult> {
  const io = new NodeIO();
  const glb = await io.writeBinary(bg3dParsedToGLTF(parsed));
  const validation = await validateBytes(glb);
  expect(validation.issues.numErrors).toBe(0);
  return gltfToBG3D(await io.readBinary(glb));
}

describe("parser format roundtrip matrix", () => {
  describe.each(bg3dFixtures)("BG3D: $label", ({ path }) => {
    it("preserves the parsed structure through binary serialization", () => {
      const original = parseBG3D(readArrayBuffer(path));
      expect(original.isOk()).toBe(true);
      if (original.isErr()) return;

      const reparsed = parseBG3D(bg3dParsedToBG3D(original.value));
      expect(reparsed.isOk()).toBe(true);
      if (reparsed.isErr()) return;

      expect(summarizeGeometry(reparsed.value)).toEqual(
        summarizeGeometry(original.value),
      );
      expect(reparsed.value.materials).toEqual(original.value.materials);
    });

    it("preserves geometry and materials through GLB and back", async () => {
      const original = parseBG3D(readArrayBuffer(path));
      expect(original.isOk()).toBe(true);
      if (original.isErr()) return;

      const roundtripped = await roundtripThroughGlb(original.value);
      expect(summarizeGeometry(roundtripped)).toEqual(
        summarizeGeometry(original.value),
      );
      expect(roundtripped.materials).toHaveLength(
        original.value.materials.length,
      );

      const reparsed = parseBG3D(bg3dParsedToBG3D(roundtripped));
      expect(reparsed.isOk()).toBe(true);
      if (reparsed.isOk()) {
        expect(summarizeGeometry(reparsed.value)).toEqual(
          summarizeGeometry(original.value),
        );
      }
    });
  });

  describe.each(threeDmfFixtures)("3DMF: $label", ({ path }) => {
    it("preserves native mesh, texture, and group data", () => {
      const original = parse3DMFNative(readArrayBuffer(path));
      expect(original.isOk()).toBe(true);
      if (original.isErr()) return;

      const written = write3DMFNative(original.value);
      expect(written.isOk()).toBe(true);
      if (written.isErr()) return;

      const reparsed = parse3DMFNative(written.value);
      expect(reparsed.isOk()).toBe(true);
      if (reparsed.isErr()) return;

      expect(reparsed.value.numMeshes).toBe(original.value.numMeshes);
      expect(reparsed.value.meshes).toEqual(original.value.meshes);
      expect(reparsed.value.numTextures).toBe(original.value.numTextures);
      expect(reparsed.value.textures).toEqual(original.value.textures);
      expect(
        reparsed.value.topLevelGroups.filter((group) => group.numMeshes > 0),
      ).toEqual(
        original.value.topLevelGroups.filter((group) => group.numMeshes > 0),
      );
    });

    it("preserves geometry through GLB and produces valid 3DMF", async () => {
      const original = parse3DMF(readArrayBuffer(path));
      expect(original.isOk()).toBe(true);
      if (original.isErr()) return;

      const roundtripped = await roundtripThroughGlb(original.value);
      expect(summarizeGeometry(roundtripped)).toEqual(
        summarizeGeometry(original.value),
      );

      const written = bg3dParsedTo3DMF(roundtripped);
      expect(written.isOk()).toBe(true);
      if (written.isErr()) return;

      const reparsed = parse3DMF(written.value);
      expect(reparsed.isOk()).toBe(true);
      if (reparsed.isOk()) {
        expect(summarizeGeometry(reparsed.value)).toEqual(
          summarizeGeometry(original.value),
        );
      }
    });
  });
});
