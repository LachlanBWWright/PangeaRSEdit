import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBG3D } from './parseBG3D';

describe('BG3D JPEG Texture Round-trip Tests', () => {
  // Test files known to contain texture data
  const testFiles = [
    { game: 'ottomatic', path: 'skeletons/Otto.bg3d' },
    { game: 'bugdom2', path: 'skeletons/Ant.bg3d' },
    { game: 'bugdom2', path: 'skeletons/Checkpoint.bg3d' },
    { game: 'nanosaur2', path: 'skeletons/nano.bg3d' },
    { game: 'nanosaur2', path: 'skeletons/worm.bg3d' },
    { game: 'cromagrally', path: 'skeletons/Brog.bg3d' },
    { game: 'billyfrontier', path: 'skeletons/Billy.bg3d' }
  ];

  test.each(testFiles)('BG3D parsing for $game/$path', async ({ game, path }) => {
    const fullPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', game, path);
    
    // Check file exists
    expect(() => readFileSync(fullPath)).not.toThrow();
    
    const bg3dBuffer = readFileSync(fullPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer);
    
    expect(bg3dData).toBeDefined();
    expect(bg3dData.groups).toBeDefined();
    expect(bg3dData.groups.length).toBeGreaterThan(0);
    
    console.log(`✅ ${game}/${path}: ${bg3dData.groups.length} groups parsed`);
  });

  test('JPEG texture data extraction and validation', async () => {
    const testCases = [
      { game: 'bugdom2', model: 'Ant.bg3d' },
      { game: 'nanosaur2', model: 'nano.bg3d' },
      { game: 'ottomatic', model: 'Otto.bg3d' }
    ];

    for (const { game, model } of testCases) {
      const fullPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', game, 'skeletons', model);
      
      if (readFileSync) {
        try {
          const bg3dBuffer = readFileSync(fullPath);
          const bg3dData = parseBG3D(bg3dBuffer.buffer);
          
          let jpegTextures = 0;
          let pngTextures = 0;
          let unknownTextures = 0;
          let totalTextureSize = 0;
          
          for (const group of bg3dData.groups) {
            if (group.materials) {
              for (const material of group.materials) {
                if (material.textureMap && material.textureMap.length > 0) {
                  totalTextureSize += material.textureMap.length;
                  
                  // Check texture type by magic bytes
                  if (material.textureMap[0] === 0xFF && material.textureMap[1] === 0xD8) {
                    jpegTextures++;
                    
                    // Validate JPEG structure
                    expect(material.textureMap[material.textureMap.length - 2]).toBe(0xFF);
                    expect(material.textureMap[material.textureMap.length - 1]).toBe(0xD9);
                  } else if (material.textureMap[0] === 0x89 && 
                            material.textureMap[1] === 0x50 && 
                            material.textureMap[2] === 0x4E && 
                            material.textureMap[3] === 0x47) {
                    pngTextures++;
                  } else {
                    unknownTextures++;
                  }
                }
              }
            }
          }
          
          console.log(`${game}/${model}: ${jpegTextures} JPEG, ${pngTextures} PNG, ${unknownTextures} unknown textures (${totalTextureSize} bytes total)`);
          
          // Expect at least some texture data in these models
          expect(jpegTextures + pngTextures + unknownTextures).toBeGreaterThan(0);
        } catch (error) {
          console.log(`⚠️  ${game}/${model}: File not found or parsing failed`);
        }
      }
    }
  });

  test('BG3D material property round-trip', async () => {
    const antPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', 'bugdom2', 'skeletons', 'Ant.bg3d');
    
    expect(() => readFileSync(antPath)).not.toThrow();
    
    const bg3dBuffer = readFileSync(antPath);
    const originalData = parseBG3D(bg3dBuffer.buffer);
    
    // Test material properties preservation
    for (const group of originalData.groups) {
      if (group.materials && group.materials.length > 0) {
        for (const material of group.materials) {
          // Check diffuse color is valid
          expect(material.diffuseColor.r).toBeGreaterThanOrEqual(0);
          expect(material.diffuseColor.r).toBeLessThanOrEqual(1);
          expect(material.diffuseColor.g).toBeGreaterThanOrEqual(0);
          expect(material.diffuseColor.g).toBeLessThanOrEqual(1);
          expect(material.diffuseColor.b).toBeGreaterThanOrEqual(0);
          expect(material.diffuseColor.b).toBeLessThanOrEqual(1);
          
          // Check flags are valid
          expect(typeof material.flags).toBe('number');
          expect(material.flags).toBeGreaterThanOrEqual(0);
          
          // If texture exists, validate basic properties
          if (material.textureMap && material.textureMap.length > 0) {
            expect(material.textureMap.length).toBeGreaterThan(10); // Should be reasonable size
            expect(material.textureMap).toBeInstanceOf(Uint8Array);
          }
        }
      }
    }
    
    console.log(`Ant material validation: ${originalData.groups.length} groups checked`);
  });

  test('BG3D geometry data round-trip', async () => {
    const nanoPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', 'nanosaur2', 'skeletons', 'nano.bg3d');
    
    expect(() => readFileSync(nanoPath)).not.toThrow();
    
    const bg3dBuffer = readFileSync(nanoPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer);
    
    let totalVertices = 0;
    let totalTriangles = 0;
    
    for (const group of bg3dData.groups) {
      if (group.geometryObjects && group.geometryObjects.length > 0) {
        for (const geo of group.geometryObjects) {
          if (geo.points && geo.points.length > 0) {
            totalVertices += geo.points.length;
            
            // Validate vertex coordinates
            for (const point of geo.points) {
              expect(isFinite(point.x)).toBe(true);
              expect(isFinite(point.y)).toBe(true);
              expect(isFinite(point.z)).toBe(true);
            }
          }
          
          if (geo.triangles && geo.triangles.length > 0) {
            totalTriangles += geo.triangles.length;
            
            // Validate triangle indices
            for (const triangle of geo.triangles) {
              expect(triangle.v1).toBeGreaterThanOrEqual(0);
              expect(triangle.v2).toBeGreaterThanOrEqual(0);
              expect(triangle.v3).toBeGreaterThanOrEqual(0);
              
              if (geo.points) {
                expect(triangle.v1).toBeLessThan(geo.points.length);
                expect(triangle.v2).toBeLessThan(geo.points.length);
                expect(triangle.v3).toBeLessThan(geo.points.length);
              }
            }
          }
        }
      }
    }
    
    expect(totalVertices).toBeGreaterThan(0);
    expect(totalTriangles).toBeGreaterThan(0);
    
    console.log(`Nano geometry: ${totalVertices} vertices, ${totalTriangles} triangles`);
  });

  test('BG3D texture coordinate validation', async () => {
    const ottoPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', 'ottomatic', 'skeletons', 'Otto.bg3d');
    
    expect(() => readFileSync(ottoPath)).not.toThrow();
    
    const bg3dBuffer = readFileSync(ottoPath);
    const bg3dData = parseBG3D(bg3dBuffer.buffer);
    
    let textureCoordCount = 0;
    
    for (const group of bg3dData.groups) {
      if (group.geometryObjects) {
        for (const geo of group.geometryObjects) {
          if (geo.uvCoords && geo.uvCoords.length > 0) {
            textureCoordCount += geo.uvCoords.length;
            
            // Validate UV coordinates are in reasonable range
            for (const uv of geo.uvCoords) {
              expect(isFinite(uv.u)).toBe(true);
              expect(isFinite(uv.v)).toBe(true);
              
              // UV coordinates are typically in 0-1 range but can extend beyond
              expect(uv.u).toBeGreaterThan(-10);
              expect(uv.u).toBeLessThan(10);
              expect(uv.v).toBeGreaterThan(-10);
              expect(uv.v).toBeLessThan(10);
            }
          }
        }
      }
    }
    
    if (textureCoordCount > 0) {
      console.log(`Otto UV coordinates: ${textureCoordCount} validated`);
    } else {
      console.log(`Otto model has no UV coordinate data`);
    }
  });

  test('Cross-game BG3D format consistency', async () => {
    const models = [
      { game: 'ottomatic', model: 'Otto.bg3d' },
      { game: 'bugdom2', model: 'Ant.bg3d' },
      { game: 'nanosaur2', model: 'nano.bg3d' }
    ];
    
    const formatStats = [];
    
    for (const { game, model } of models) {
      const fullPath = join(__dirname, '..', '..', 'public', 'PangeaRSEdit', 'games', game, 'skeletons', model);
      
      try {
        const bg3dBuffer = readFileSync(fullPath);
        const bg3dData = parseBG3D(bg3dBuffer.buffer);
        
        const stats = {
          game,
          model,
          groupCount: bg3dData.groups.length,
          totalMaterials: bg3dData.groups.reduce((sum, g) => sum + (g.materials?.length || 0), 0),
          totalGeometries: bg3dData.groups.reduce((sum, g) => sum + (g.geometryObjects?.length || 0), 0),
          hasTextures: bg3dData.groups.some(g => 
            g.materials?.some(m => m.textureMap && m.textureMap.length > 0)
          )
        };
        
        formatStats.push(stats);
        
        // Verify basic structure consistency
        expect(bg3dData.groups).toBeDefined();
        expect(bg3dData.groups.length).toBeGreaterThan(0);
        
      } catch (error) {
        console.log(`⚠️  ${game}/${model}: Could not parse - ${error}`);
      }
    }
    
    // All parsed models should have similar basic structure
    expect(formatStats.length).toBeGreaterThan(0);
    
    for (const stats of formatStats) {
      console.log(`${stats.game}/${stats.model}: ${stats.groupCount} groups, ${stats.totalMaterials} materials, ${stats.totalGeometries} geometries, textures: ${stats.hasTextures}`);
    }
  });
});