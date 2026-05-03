import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock Three.js objects
interface MockTexture {
  image: {
    src?: string;
    width?: number;
    height?: number;
    data?: Uint8Array;
  };
  source?: { uri?: string | null };
}

interface MockMaterial {
  name: string;
  map?: MockTexture | null;
  normalMap?: MockTexture | null;
  roughnessMap?: MockTexture | null;
  metalnessMap?: MockTexture | null;
  aoMap?: MockTexture | null;
  emissiveMap?: MockTexture | null;
  specularMap?: MockTexture | null;
  alphaMap?: MockTexture | null;
  bumpMap?: MockTexture | null;
  displacementMap?: MockTexture | null;
}

interface MockMesh {
  id: number;
  name: string;
  visible: boolean;
  material: MockMaterial | MockMaterial[];
  children: MockMesh[];
  traverse?: (cb: (child: MockMesh) => void) => void;
}

interface MockGroup {
  id: number;
  name: string;
  visible: boolean;
  children: MockMesh[];
  traverse: (cb: (child: MockMesh) => void) => void;
}

interface ExtractedTexture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material: string;
  size?: { width: number; height: number };
}

type MaterialTextureKey =
  | "map"
  | "normalMap"
  | "roughnessMap"
  | "metalnessMap"
  | "aoMap"
  | "emissiveMap"
  | "specularMap"
  | "alphaMap"
  | "bumpMap"
  | "displacementMap";

interface TextureSpec {
  key: MaterialTextureKey;
  type: ExtractedTexture["type"];
  suffix: string;
}

const DEFAULT_TEXTURE_SPECS: TextureSpec[] = [
  { key: "map", type: "diffuse", suffix: "Diffuse" },
  { key: "normalMap", type: "normal", suffix: "Normal" },
  { key: "roughnessMap", type: "other", suffix: "Roughness" },
  { key: "metalnessMap", type: "other", suffix: "Metalness" },
  { key: "aoMap", type: "other", suffix: "AO" },
  { key: "emissiveMap", type: "other", suffix: "Emissive" },
  { key: "specularMap", type: "other", suffix: "Specular" },
  { key: "alphaMap", type: "other", suffix: "Alpha" },
  { key: "bumpMap", type: "other", suffix: "Bump" },
  { key: "displacementMap", type: "other", suffix: "Displacement" },
];

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const dataBuffer = data.buffer;
  if (dataBuffer instanceof ArrayBuffer) return dataBuffer;
  return new Uint8Array(dataBuffer).slice().buffer;
}

function getTextureUrl(texture: MockTexture, allowRawDataUrl: boolean): string {
  if (texture.image.src) return texture.image.src;
  if (allowRawDataUrl && texture.image.data instanceof Uint8Array) {
    const blob = new Blob([toArrayBuffer(texture.image.data)], {
      type: "image/png",
    });
    return URL.createObjectURL(blob);
  }
  return texture.source?.uri ?? "";
}

function getTextureSize(
  texture: MockTexture,
): { width: number; height: number } | undefined {
  if (
    typeof texture.image.width === "number" &&
    typeof texture.image.height === "number"
  ) {
    return { width: texture.image.width, height: texture.image.height };
  }
  return undefined;
}

function extractTexturesFromMeshes(
  meshes: MockMesh[],
  specs: TextureSpec[],
  allowRawDataUrl: boolean,
): ExtractedTexture[] {
  const textures: ExtractedTexture[] = [];
  const textureUrls = new Set<string>();

  for (const mesh of meshes) {
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    for (const mat of materials) {
      for (const spec of specs) {
        const texture = mat[spec.key];
        if (!texture || !texture.image) continue;
        const url = getTextureUrl(texture, allowRawDataUrl);
        if (!url || textureUrls.has(url)) continue;
        textureUrls.add(url);
        textures.push({
          name: `${mat.name}_${spec.suffix}`,
          url,
          type: spec.type,
          material: mat.name,
          size: getTextureSize(texture),
        });
      }
    }
  }

  return textures;
}

const createMockTexture = (url: string, width?: number, height?: number) => ({
  image: {
    src: url,
    width,
    height,
    data: width && height ? new Uint8Array(width * height * 4) : undefined,
  },
  source: { uri: url },
});

const createMockMaterial = (
  textures: Record<string, MockTexture> = {},
): MockMaterial => ({
  name: "TestMaterial",
  map: textures.diffuse || null,
  normalMap: textures.normal || null,
  roughnessMap: textures.roughness || null,
  metalnessMap: textures.metalness || null,
  aoMap: textures.ao || null,
  emissiveMap: textures.emissive || null,
  specularMap: textures.specular || null,
  alphaMap: textures.alpha || null,
  bumpMap: textures.bump || null,
  displacementMap: textures.displacement || null,
});

const createMockMesh = (
  materials: MockMaterial[] = [],
  children: MockMesh[] = [],
  id = 1,
  name = "TestMesh",
): MockMesh => ({
  id,
  name,
  visible: true,
  material:
    materials.length === 1
      ? (materials[0] ?? createMockMaterial())
      : materials.length > 0
        ? materials
        : createMockMaterial(),
  children,
  traverse: vi.fn((callback: (child: MockMesh) => void) => {
    children.forEach(callback);
  }),
});

const createMockGroup = (
  children: MockMesh[],
  id = 2,
  name = "TestGroup",
): MockGroup => ({
  id,
  name,
  visible: true,
  children,
  traverse: vi.fn((callback: (child: MockMesh) => void) => {
    children.forEach(callback);
  }),
});

describe("Enhanced Texture Extraction", () => {
  let mockScene: MockGroup | null = null;
  let extractedTextures: ExtractedTexture[];

  beforeEach(() => {
    extractedTextures = [];
  });

  test("should extract diffuse textures correctly", () => {
    const diffuseTexture = createMockTexture(
      "data:image/png;base64,test123",
      512,
      512,
    );
    const material = createMockMaterial({ diffuse: diffuseTexture });
    const mesh = createMockMesh([material]);

    mockScene = createMockGroup([mesh]);

    extractedTextures = extractTexturesFromMeshes(
      [mesh],
      DEFAULT_TEXTURE_SPECS,
      true,
    );

    expect(mockScene).toBeDefined();
    expect(extractedTextures).toHaveLength(1);
    const firstTexture = extractedTextures[0];
    expect(firstTexture).toBeDefined();
    if (firstTexture) {
      expect(firstTexture.name).toBe("TestMaterial_Diffuse");
      expect(firstTexture.url).toBe("data:image/png;base64,test123");
      expect(firstTexture.type).toBe("diffuse");
      expect(firstTexture.size).toEqual({ width: 512, height: 512 });
    }
  });

  test("should extract multiple texture types from single material", () => {
    const diffuseTexture = createMockTexture("diffuse.png", 256, 256);
    const normalTexture = createMockTexture("normal.png", 256, 256);
    const roughnessTexture = createMockTexture("roughness.png", 256, 256);

    const material = createMockMaterial({
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture,
    });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    extractedTextures = extractTexturesFromMeshes(
      [mesh],
      [
        { key: "map", type: "diffuse", suffix: "Diffuse" },
        { key: "normalMap", type: "normal", suffix: "Normal" },
        { key: "roughnessMap", type: "other", suffix: "Roughness" },
      ],
      false,
    );

    expect(mockScene).toBeDefined();
    expect(extractedTextures).toHaveLength(3);

    const diffuse = extractedTextures.find((t) => t.type === "diffuse");
    const normal = extractedTextures.find((t) => t.type === "normal");
    const roughness = extractedTextures.find((t) => t.type === "other");

    expect(diffuse?.name).toBe("TestMaterial_Diffuse");
    expect(normal?.name).toBe("TestMaterial_Normal");
    expect(roughness?.name).toBe("TestMaterial_Roughness");
  });

  test("should handle data URI textures", () => {
    const dataTexture = createMockTexture(
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==",
      128,
      128,
    );
    const material = createMockMaterial({ diffuse: dataTexture });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    extractedTextures = extractTexturesFromMeshes(
      [mesh],
      [{ key: "map", type: "diffuse", suffix: "Diffuse" }],
      false,
    );

    expect(mockScene).toBeDefined();
    expect(extractedTextures).toHaveLength(1);
    const firstTexture = extractedTextures[0];
    expect(firstTexture).toBeDefined();
    if (firstTexture) {
      expect(firstTexture.url).toContain("data:image/jpeg;base64");
      expect(firstTexture.type).toBe("diffuse");
    }
  });

  test("should handle textures with raw data (ArrayBuffer/Uint8Array)", () => {
    const rawData = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]); // 2x1 RGBA
    const textureWithRawData = {
      image: {
        data: rawData,
        width: 2,
        height: 1,
      },
      source: { uri: null },
    };

    const material = createMockMaterial({ diffuse: textureWithRawData });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    // Mock URL.createObjectURL for testing
    const mockObjectURL = "blob:http://localhost/test-texture";
    global.URL.createObjectURL = vi.fn(() => mockObjectURL);

    extractedTextures = extractTexturesFromMeshes(
      [mesh],
      [{ key: "map", type: "diffuse", suffix: "Diffuse" }],
      true,
    );

    expect(mockScene).toBeDefined();
    expect(extractedTextures).toHaveLength(1);
    const firstTexture = extractedTextures[0];
    expect(firstTexture).toBeDefined();
    if (firstTexture) {
      expect(firstTexture.url).toBe(mockObjectURL);
      expect(firstTexture.size).toEqual({ width: 2, height: 1 });
    }
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  test("should avoid duplicate textures with same URL", () => {
    const sharedTexture = createMockTexture("shared.png", 256, 256);
    const material1 = createMockMaterial({ diffuse: sharedTexture });
    const material2 = createMockMaterial({ diffuse: sharedTexture });
    const mesh1 = createMockMesh([material1]);
    const mesh2 = createMockMesh([material2]);
    mockScene = createMockGroup([mesh1, mesh2]);

    extractedTextures = extractTexturesFromMeshes(
      [mesh1, mesh2],
      [{ key: "map", type: "diffuse", suffix: "Diffuse" }],
      false,
    );

    expect(mockScene).toBeDefined();
    expect(extractedTextures).toHaveLength(1); // Should only have one texture despite being used in two materials
    const firstTexture = extractedTextures[0];
    expect(firstTexture).toBeDefined();
    if (firstTexture) {
      expect(firstTexture.url).toBe("shared.png");
    }
  });
});
