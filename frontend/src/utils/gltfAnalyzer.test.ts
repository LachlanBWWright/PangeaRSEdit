import { describe, test, expect, vi } from 'vitest';
import { analyzeGLTF, splitGLTFByNodes } from './gltfAnalyzer';

// Mock @gltf-transform/core
vi.mock('@gltf-transform/core', () => {
  const mockTexture = {
    getName: () => 'TestTexture',
    getURI: () => 'data:image/png;base64,test',
    getMimeType: () => 'image/png',
    clone: vi.fn().mockReturnThis()
  };

  const mockMaterial = {
    getName: () => 'TestMaterial',
    getBaseColorTexture: () => mockTexture,
    getNormalTexture: () => null,
    getMetallicRoughnessTexture: () => null,
    getOcclusionTexture: () => null,
    getEmissiveTexture: () => null,
    clone: vi.fn().mockReturnThis()
  };

  const mockPrimitive = {
    getMaterial: () => mockMaterial
  };

  const mockMesh = {
    listPrimitives: () => [mockPrimitive]
  };

  const mockNode = {
    getName: () => 'TestNode',
    getMesh: () => mockMesh,
    listChildren: () => [],
    clone: vi.fn().mockReturnThis()
  };

  const mockScene = {
    addChild: vi.fn()
  };

  const mockRoot = {
    listNodes: () => [mockNode],
    listMeshes: () => [mockMesh],
    listMaterials: () => [mockMaterial],
    listTextures: () => [mockTexture],
    getDefaultScene: () => mockScene
  };

  const mockDocument = {
    getRoot: () => mockRoot
  };

  const mockWebIO = {
    readBinary: vi.fn().mockResolvedValue(mockDocument)
  };

  return {
    Document: vi.fn().mockImplementation(() => mockDocument),
    WebIO: vi.fn().mockImplementation(() => mockWebIO)
  };
});

describe('gltfAnalyzer', () => {
  test('analyzeGLTF should extract GLTF information correctly', async () => {
    const mockArrayBuffer = new ArrayBuffer(100);
    
    const analysis = await analyzeGLTF(mockArrayBuffer);
    
    expect(analysis.nodeCount).toBe(1);
    expect(analysis.meshCount).toBe(1);
    expect(analysis.materialCount).toBe(1);
    expect(analysis.textureCount).toBe(1);
    
    expect(analysis.nodes).toHaveLength(1);
    expect(analysis.nodes[0].name).toBe('TestNode');
    
    expect(analysis.materials).toHaveLength(1);
    expect(analysis.materials[0].name).toBe('TestMaterial');
    expect(analysis.materials[0].textures).toHaveLength(1);
    expect(analysis.materials[0].textures[0].type).toBe('baseColor');
    
    expect(analysis.textures).toHaveLength(1);
    expect(analysis.textures[0].name).toBe('TestTexture');
    expect(analysis.textures[0].uri).toBe('data:image/png;base64,test');
    expect(analysis.textures[0].mimeType).toBe('image/png');
  });

  test('splitGLTFByNodes should create separate documents for each node', async () => {
    const { Document } = await import('@gltf-transform/core');
    const mockDoc = new Document();
    
    const documents = splitGLTFByNodes(mockDoc);
    
    expect(documents).toHaveLength(1);
    expect(documents[0]).toBeInstanceOf(Document);
  });
});