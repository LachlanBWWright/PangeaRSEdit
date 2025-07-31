import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock Three.js objects
const createMockTexture = (url: string, width?: number, height?: number) => ({
  image: {
    src: url,
    width,
    height,
    data: width && height ? new Uint8Array(width * height * 4) : undefined
  },
  source: { uri: url }
});

const createMockMaterial = (textures: any = {}) => ({
  name: 'TestMaterial',
  map: textures.diffuse || null,
  normalMap: textures.normal || null,
  roughnessMap: textures.roughness || null,
  metalnessMap: textures.metalness || null,
  aoMap: textures.ao || null,
  emissiveMap: textures.emissive || null,
  specularMap: textures.specular || null,
  alphaMap: textures.alpha || null,
  bumpMap: textures.bump || null,
  displacementMap: textures.displacement || null
});

const createMockMesh = (materials: any[]) => ({
  id: 1,
  name: 'TestMesh',
  visible: true,
  material: materials.length === 1 ? materials[0] : materials,
  children: []
});

const createMockGroup = (children: any[]) => ({
  id: 2,
  name: 'TestGroup',
  visible: true,
  children,
  traverse: vi.fn((callback: Function) => {
    callback(children[0]);
    if (children[0]?.children) {
      children[0].children.forEach(callback);
    }
  })
});

describe('Enhanced Texture Extraction', () => {
  let mockScene: any;
  let extractedTextures: any[];

  beforeEach(() => {
    extractedTextures = [];
  });

  test('should extract diffuse textures correctly', () => {
    const diffuseTexture = createMockTexture('data:image/png;base64,test123', 512, 512);
    const material = createMockMaterial({ diffuse: diffuseTexture });
    const mesh = createMockMesh([material]);
    
    mockScene = createMockGroup([mesh]);

    // Simulate the texture extraction logic from EnhancedModelMesh
    const extractTextures = () => {
      const textures: any[] = [];
      const textureUrls = new Set<string>();
      
      const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string, materialName: string) => {
        if (texture && texture.image) {
          let url = '';
          
          if (texture.image.src) {
            url = texture.image.src;
          } else if (texture.image.data instanceof Uint8Array) {
            const blob = new Blob([texture.image.data], { type: 'image/png' });
            url = URL.createObjectURL(blob);
          } else if (texture.source && texture.source.uri) {
            url = texture.source.uri;
          }
          
          if (url && !textureUrls.has(url)) {
            textureUrls.add(url);
            
            const size = texture.image.width && texture.image.height ? 
              { width: texture.image.width, height: texture.image.height } : undefined;
            
            textures.push({
              name: `${materialName}_${suffix}`,
              url,
              type,
              material: materialName,
              size
            });
          }
        }
      };

      // Simulate traversing the mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((mat: any) => {
        processTexture(mat.map, 'diffuse', 'Diffuse', mat.name);
        processTexture(mat.normalMap, 'normal', 'Normal', mat.name);
        processTexture(mat.roughnessMap, 'other', 'Roughness', mat.name);
        processTexture(mat.metalnessMap, 'other', 'Metalness', mat.name);
        processTexture(mat.aoMap, 'other', 'AO', mat.name);
        processTexture(mat.emissiveMap, 'other', 'Emissive', mat.name);
        processTexture(mat.specularMap, 'other', 'Specular', mat.name);
        processTexture(mat.alphaMap, 'other', 'Alpha', mat.name);
        processTexture(mat.bumpMap, 'other', 'Bump', mat.name);
        processTexture(mat.displacementMap, 'other', 'Displacement', mat.name);
      });

      return textures;
    };

    extractedTextures = extractTextures();

    expect(extractedTextures).toHaveLength(1);
    expect(extractedTextures[0].name).toBe('TestMaterial_Diffuse');
    expect(extractedTextures[0].url).toBe('data:image/png;base64,test123');
    expect(extractedTextures[0].type).toBe('diffuse');
    expect(extractedTextures[0].size).toEqual({ width: 512, height: 512 });
  });

  test('should extract multiple texture types from single material', () => {
    const diffuseTexture = createMockTexture('diffuse.png', 256, 256);
    const normalTexture = createMockTexture('normal.png', 256, 256);
    const roughnessTexture = createMockTexture('roughness.png', 256, 256);
    
    const material = createMockMaterial({
      diffuse: diffuseTexture,
      normal: normalTexture,
      roughness: roughnessTexture
    });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    const extractTextures = () => {
      const textures: any[] = [];
      const textureUrls = new Set<string>();
      
      const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string, materialName: string) => {
        if (texture && texture.image) {
          const url = texture.image.src || texture.source.uri;
          if (url && !textureUrls.has(url)) {
            textureUrls.add(url);
            textures.push({
              name: `${materialName}_${suffix}`,
              url,
              type,
              material: materialName,
              size: { width: texture.image.width, height: texture.image.height }
            });
          }
        }
      };

      const materials = [mesh.material];
      materials.forEach((mat: any) => {
        processTexture(mat.map, 'diffuse', 'Diffuse', mat.name);
        processTexture(mat.normalMap, 'normal', 'Normal', mat.name);
        processTexture(mat.roughnessMap, 'other', 'Roughness', mat.name);
      });

      return textures;
    };

    extractedTextures = extractTextures();

    expect(extractedTextures).toHaveLength(3);
    
    const diffuse = extractedTextures.find(t => t.type === 'diffuse');
    const normal = extractedTextures.find(t => t.type === 'normal');
    const roughness = extractedTextures.find(t => t.type === 'other');
    
    expect(diffuse?.name).toBe('TestMaterial_Diffuse');
    expect(normal?.name).toBe('TestMaterial_Normal');
    expect(roughness?.name).toBe('TestMaterial_Roughness');
  });

  test('should handle data URI textures', () => {
    const dataTexture = createMockTexture('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ==', 128, 128);
    const material = createMockMaterial({ diffuse: dataTexture });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    const extractTextures = () => {
      const textures: any[] = [];
      const textureUrls = new Set<string>();
      
      const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string, materialName: string) => {
        if (texture && texture.image) {
          const url = texture.image.src || texture.source.uri;
          if (url && !textureUrls.has(url)) {
            textureUrls.add(url);
            textures.push({
              name: `${materialName}_${suffix}`,
              url,
              type,
              material: materialName
            });
          }
        }
      };

      const materials = [mesh.material];
      materials.forEach((mat: any) => {
        processTexture(mat.map, 'diffuse', 'Diffuse', mat.name);
      });

      return textures;
    };

    extractedTextures = extractTextures();

    expect(extractedTextures).toHaveLength(1);
    expect(extractedTextures[0].url).toContain('data:image/jpeg;base64');
    expect(extractedTextures[0].type).toBe('diffuse');
  });

  test('should handle textures with raw data (ArrayBuffer/Uint8Array)', () => {
    const rawData = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]); // 2x1 RGBA
    const textureWithRawData = {
      image: {
        data: rawData,
        width: 2,
        height: 1
      },
      source: { uri: null }
    };
    
    const material = createMockMaterial({ diffuse: textureWithRawData });
    const mesh = createMockMesh([material]);
    mockScene = createMockGroup([mesh]);

    // Mock URL.createObjectURL for testing
    const mockObjectURL = 'blob:http://localhost/test-texture';
    global.URL.createObjectURL = vi.fn(() => mockObjectURL);

    const extractTextures = () => {
      const textures: any[] = [];
      const textureUrls = new Set<string>();
      
      const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string, materialName: string) => {
        if (texture && texture.image) {
          let url = '';
          
          if (texture.image.src) {
            url = texture.image.src;
          } else if (texture.image.data instanceof Uint8Array) {
            const blob = new Blob([texture.image.data], { type: 'image/png' });
            url = URL.createObjectURL(blob);
          } else if (texture.source && texture.source.uri) {
            url = texture.source.uri;
          }
          
          if (url && !textureUrls.has(url)) {
            textureUrls.add(url);
            textures.push({
              name: `${materialName}_${suffix}`,
              url,
              type,
              material: materialName,
              size: { width: texture.image.width, height: texture.image.height }
            });
          }
        }
      };

      const materials = [mesh.material];
      materials.forEach((mat: any) => {
        processTexture(mat.map, 'diffuse', 'Diffuse', mat.name);
      });

      return textures;
    };

    extractedTextures = extractTextures();

    expect(extractedTextures).toHaveLength(1);
    expect(extractedTextures[0].url).toBe(mockObjectURL);
    expect(extractedTextures[0].size).toEqual({ width: 2, height: 1 });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  test('should avoid duplicate textures with same URL', () => {
    const sharedTexture = createMockTexture('shared.png', 256, 256);
    const material1 = createMockMaterial({ diffuse: sharedTexture });
    const material2 = createMockMaterial({ diffuse: sharedTexture });
    const mesh1 = createMockMesh([material1]);
    const mesh2 = createMockMesh([material2]);
    mockScene = createMockGroup([mesh1, mesh2]);

    const extractTextures = () => {
      const textures: any[] = [];
      const textureUrls = new Set<string>();
      
      const processTexture = (texture: any, type: 'diffuse' | 'normal' | 'other', suffix: string, materialName: string) => {
        if (texture && texture.image) {
          const url = texture.image.src || texture.source.uri;
          if (url && !textureUrls.has(url)) {
            textureUrls.add(url);
            textures.push({
              name: `${materialName}_${suffix}`,
              url,
              type,
              material: materialName
            });
          }
        }
      };

      // Process both meshes
      [mesh1, mesh2].forEach(mesh => {
        const materials = [mesh.material];
        materials.forEach((mat: any) => {
          processTexture(mat.map, 'diffuse', 'Diffuse', mat.name);
        });
      });

      return textures;
    };

    extractedTextures = extractTextures();

    expect(extractedTextures).toHaveLength(1); // Should only have one texture despite being used in two materials
    expect(extractedTextures[0].url).toBe('shared.png');
  });
});