import { describe, expect, it } from "vitest";
import {
  formatGltfCompatibilityWarnings,
  normalizeGltfAsset,
} from "./gltfCompatibility";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

function dataUriForBytes(bytes: Uint8Array): string {
  return `data:application/octet-stream;base64,${Buffer.from(bytes).toString("base64")}`;
}

function pngDataUri(): string {
  return `data:image/png;base64,${TINY_PNG_BASE64}`;
}

function buildTriangleBuffer(): Uint8Array {
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
  ]);
  const normals = new Float32Array([
    0, 0, 1,
    0, 0, 1,
    0, 0, 1,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    0, 1,
  ]);
  const indices = new Uint16Array([0, 1, 2]);

  const bytes = new Uint8Array(
    positions.byteLength + normals.byteLength + uvs.byteLength + indices.byteLength,
  );
  let offset = 0;
  bytes.set(new Uint8Array(positions.buffer), offset);
  offset += positions.byteLength;
  bytes.set(new Uint8Array(normals.buffer), offset);
  offset += normals.byteLength;
  bytes.set(new Uint8Array(uvs.buffer), offset);
  offset += uvs.byteLength;
  bytes.set(new Uint8Array(indices.buffer), offset);
  return bytes;
}

function createEmbeddedGltf(
  overrides?: Partial<{
    readonly extensionsUsed: readonly string[];
    readonly extensionsRequired: readonly string[];
    readonly bufferUri: string;
  }>,
): ArrayBuffer {
  const meshBytes = buildTriangleBuffer();
  const bufferUri = overrides?.bufferUri ?? dataUriForBytes(meshBytes);
  const gltfJson = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }, { nodes: [1] }],
    nodes: [{ mesh: 0 }, { camera: 0 }],
    cameras: [
      {
        type: "perspective",
        perspective: {
          yfov: 1,
          znear: 0.1,
        },
      },
    ],
    buffers: [
      {
        byteLength: meshBytes.byteLength,
        uri: bufferUri,
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 36, byteLength: 36, target: 34962 },
      { buffer: 0, byteOffset: 72, byteLength: 24, target: 34962 },
      { buffer: 0, byteOffset: 96, byteLength: 6, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 2, componentType: 5126, count: 3, type: "VEC2" },
      { bufferView: 3, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    images: [{ uri: pngDataUri() }],
    textures: [{ source: 0 }],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.4,
          roughnessFactor: 0.2,
          metallicRoughnessTexture: { index: 0 },
        },
        normalTexture: { index: 0 },
        emissiveTexture: { index: 0 },
        occlusionTexture: { index: 0 },
        emissiveFactor: [1, 1, 1],
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    extensionsUsed: overrides?.extensionsUsed ?? ["KHR_lights_punctual"],
    extensionsRequired: overrides?.extensionsRequired ?? [],
  };

  return new TextEncoder().encode(JSON.stringify(gltfJson)).buffer;
}

describe("gltfCompatibility", () => {
  it("normalizes embedded .gltf uploads and reports downgrade warnings", async () => {
    const result = await normalizeGltfAsset(
      "rich-model.gltf",
      createEmbeddedGltf(),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.fail(result.error.message);
    }

    const warnings = formatGltfCompatibilityWarnings(result.value.warnings);
    expect(result.value.sourceFormat).toBe("gltf");
    expect(new DataView(result.value.normalizedGlb).getUint32(0, true)).toBe(
      0x46546c67,
    );
    expect(
      warnings.some((warning) =>
        warning.includes("Kept base color inputs"),
      ),
    ).toBe(true);
    expect(
      warnings.some((warning) =>
        warning.includes("Ignored glTF cameras"),
      ),
    ).toBe(true);
    expect(
      warnings.some((warning) =>
        warning.includes("Ignored optional glTF extensions"),
      ),
    ).toBe(true);
  });

  it("rejects unsupported required extensions with a typed compatibility error", async () => {
    const result = await normalizeGltfAsset(
      "unsupported-required.gltf",
      createEmbeddedGltf({
        extensionsRequired: ["KHR_texture_transform"],
      }),
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected required extension failure");
    }
    expect(result.error.code).toBe("gltf.unsupported-required-extension");
    expect(result.error.message).toContain("KHR_texture_transform");
  });

  it("rejects missing external sidecar resources", async () => {
    const result = await normalizeGltfAsset(
      "sidecar.gltf",
      createEmbeddedGltf({
        bufferUri: "mesh.bin",
      }),
    );

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected missing dependency failure");
    }
    expect(result.error.code).toBe("gltf.missing-dependency");
    expect(result.error.message).toContain("mesh.bin");
  });

  it("warns for optional Draco compression metadata instead of rejecting the asset", async () => {
    const result = await normalizeGltfAsset(
      "optional-draco.gltf",
      createEmbeddedGltf({
        extensionsUsed: ["KHR_draco_mesh_compression"],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      expect.fail(result.error.message);
    }

    const warnings = formatGltfCompatibilityWarnings(result.value.warnings);
    expect(
      warnings.some((warning) => warning.includes("KHR_draco_mesh_compression")),
    ).toBe(true);
  });
});
