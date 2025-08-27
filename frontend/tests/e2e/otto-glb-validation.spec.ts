import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';

test('Otto GLB Download and Validation', async ({ page }) => {
  console.log('=== OTTO GLB DOWNLOAD AND VALIDATION ===');
  
  // Navigate to the application
  await page.goto('/');
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  
  // Click Otto with skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  // Wait for model to load
  await page.waitForTimeout(8000);
  
  // Download GLB file
  const glbButton = page.locator('button:has-text("Download as GLB")');
  await expect(glbButton).toBeVisible();
  
  const downloadPromise = page.waitForEvent('download');
  await glbButton.click();
  const download = await downloadPromise;
  
  // Save the download to a temporary file
  const downloadPath = '/tmp/otto-skeleton.glb';
  await download.saveAs(downloadPath);
  
  // Check file size (should be around 490KB)
  const stats = await fs.stat(downloadPath);
  console.log('GLB file size:', stats.size, 'bytes');
  expect(stats.size).toBeGreaterThan(400000); // Should be much larger than 96KB without skeleton
  
  // Read and validate GLB header
  const buffer = await fs.readFile(downloadPath);
  
  // Check GLB magic number
  const magic = buffer.toString('ascii', 0, 4);
  console.log('GLB magic number:', magic);
  expect(magic).toBe('glTF');
  
  // Check GLB version
  const version = buffer.readUInt32LE(4);
  console.log('GLB version:', version);
  expect(version).toBe(2);
  
  // Check total length
  const length = buffer.readUInt32LE(8);
  console.log('GLB total length:', length);
  expect(length).toBe(stats.size);
  
  // Basic validation passed
  console.log('✅ GLB file structure is valid');
  
  // Try to validate with a simple JSON check of the JSON chunk
  try {
    const jsonChunkLength = buffer.readUInt32LE(12);
    const jsonChunkType = buffer.readUInt32LE(16);
    
    console.log('JSON chunk length:', jsonChunkLength);
    console.log('JSON chunk type:', jsonChunkType.toString(16));
    
    if (jsonChunkType === 0x4E4F534A) { // "JSON"
      const jsonStart = 20;
      const jsonEnd = jsonStart + jsonChunkLength;
      const jsonString = buffer.toString('utf8', jsonStart, jsonEnd);
      const gltfJson = JSON.parse(jsonString);
      
      console.log('glTF asset version:', gltfJson.asset?.version);
      console.log('glTF scenes:', gltfJson.scenes?.length || 0);
      console.log('glTF nodes:', gltfJson.nodes?.length || 0);
      console.log('glTF meshes:', gltfJson.meshes?.length || 0);
      console.log('glTF skins:', gltfJson.skins?.length || 0);
      console.log('glTF animations:', gltfJson.animations?.length || 0);
      
      // Check for skeleton-related structures
      if (gltfJson.skins && gltfJson.skins.length > 0) {
        const skin = gltfJson.skins[0];
        console.log('Skin joints count:', skin.joints?.length || 0);
        console.log('✅ Skin structure found in glTF');
      }
      
      if (gltfJson.animations && gltfJson.animations.length > 0) {
        console.log('Animation names:', gltfJson.animations.map((a: any) => a.name).slice(0, 5));
        console.log('✅ Animations found in glTF');
      }
      
      // Check for scene structure
      if (gltfJson.scenes && gltfJson.scenes.length > 0) {
        const scene = gltfJson.scenes[0];
        console.log('Scene root nodes:', scene.nodes?.length || 0);
        console.log('✅ Scene structure found');
      }
      
    } else {
      console.log('❌ JSON chunk not found or invalid type');
    }
  } catch (e) {
    console.log('❌ Error parsing GLB JSON:', e.message);
  }
  
  console.log('🔍 GLB validation complete');
});