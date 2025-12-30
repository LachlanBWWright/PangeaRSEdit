import { describe, test, expect, vi } from "vitest";
import { analyzeGLTF, splitGLTFByNodes } from "./gltfAnalyzer";

// Mock @gltf-transform/core
vi.mock("@gltf-transform/core", () => {
  const mockTexture = {
    getName: () => "TestTexture",
    getURI: () => "data:image/png;base64,test",
    getMimeType: () => "image/png",
    clone: vi.fn(function(this: unknown) { return this; }),
  };

  const mockMaterial = {
    getName: () => "TestMaterial",
    getBaseColorTexture: () => mockTexture,
    getNormalTexture: () => null,
    getMetallicRoughnessTexture: () => null,
    getOcclusionTexture: () => null,
    getEmissiveTexture: () => null,
    clone: vi.fn(function(this: unknown) { return this; }),
  };

  const mockPrimitive = {
    getMaterial: () => mockMaterial,
  };

  const mockMesh = {
    listPrimitives: () => [mockPrimitive],
  };

  const mockNode = {
    getName: () => "TestNode",
    getMesh: () => mockMesh,
    listChildren: () => [],
    clone: vi.fn(function(this: unknown) { return this; }),
  };

  const mockScene = {
    addChild: vi.fn(),
  };

  const mockRoot = {
    listNodes: () => [mockNode],
    listMeshes: () => [mockMesh],
    listMaterials: () => [mockMaterial],
    listTextures: () => [mockTexture],
    getDefaultScene: () => mockScene,
  };

  const mockDocument = {
    getRoot: () => mockRoot,
  };

  const mockWebIO = {
    readBinary: vi.fn().mockResolvedValue(mockDocument),
  };

  return {
    Document: vi.fn().mockImplementation(() => mockDocument),
    WebIO: vi.fn().mockImplementation(() => mockWebIO),
  };
});

describe("gltfAnalyzer", () => {
  test("analyzeGLTF should extract GLTF information correctly", async () => {
    const mockArrayBuffer = new ArrayBuffer(100);

    const analysis = await analyzeGLTF(mockArrayBuffer);

    expect(analysis.nodeCount).toBe(1);
    expect(analysis.meshCount).toBe(1);
    expect(analysis.materialCount).toBe(1);
    expect(analysis.textureCount).toBe(1);

    expect(analysis.nodes).toHaveLength(1);
    const node = analysis.nodes[0];
    if (!node) throw new Error("expected node");
    expect(node.name).toBe("TestNode");

    expect(analysis.materials).toHaveLength(1);
    const material = analysis.materials[0];
    if (!material) throw new Error("expected material");
    expect(material.name).toBe("TestMaterial");
    expect(material.textures).toHaveLength(1);
    const texInfo = material.textures[0];
    if (!texInfo) throw new Error("expected texture info");
    expect(texInfo.type).toBe("baseColor");

    expect(analysis.textures).toHaveLength(1);
    const texture = analysis.textures[0];
    if (!texture) throw new Error("expected texture");
    expect(texture.name).toBe("TestTexture");
    expect(texture.uri).toBe("data:image/png;base64,test");
    expect(texture.mimeType).toBe("image/png");
  });

  test("splitGLTFByNodes should create separate documents for each node", async () => {
    const { Document } = await import("@gltf-transform/core");
    const mockDoc = new Document();

    const documents = splitGLTFByNodes(mockDoc);

    expect(documents).toHaveLength(1);
    const doc = documents[0];
    if (!doc) throw new Error("expected document");
    expect(doc).toHaveProperty("getRoot");
    expect(typeof doc.getRoot).toBe("function");
  });
});
