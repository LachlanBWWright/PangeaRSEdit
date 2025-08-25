/**
 * Test browser-based roundtrip conversion
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

test('Browser Roundtrip Test', async ({ page }) => {
  console.log('Testing browser-based roundtrip conversion...');
  
  // 1. Load original files for comparison
  const originalBg3dPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.bg3d';
  const originalSkeletonPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public/Otto.skeleton.rsrc';
  const originalBg3dData = readFileSync(originalBg3dPath);
  const originalSkeletonData = readFileSync(originalSkeletonPath);
  
  console.log(`Original BG3D size: ${originalBg3dData.length} bytes`);
  console.log(`Original skeleton size: ${originalSkeletonData.length} bytes`);
  
  // 2. Go to model viewer and load Otto
  await page.goto('http://localhost:5173/PangeaRSEdit/#/model-viewer');
  await page.waitForLoadState('networkidle');
  
  const ottoButton = page.locator('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  console.log('Otto loaded, waiting for processing...');
  await page.waitForTimeout(8000);
  
  // 3. Check that animations loaded with proper timing
  const animationDropdown = page.locator('select').first();
  await expect(animationDropdown).toBeVisible();
  
  const animationOptions = await animationDropdown.locator('option').allTextContents();
  console.log(`Found ${animationOptions.length - 1} animations`);
  
  // Check if animations have proper durations (not all 0:01.00)
  const animationsWithTimings = animationOptions.filter(opt => opt.includes('(') && opt.includes(')'));
  const uniqueDurations = new Set(animationsWithTimings.map(opt => opt.match(/\(([^)]+)\)/)?.[1]));
  console.log('Unique animation durations found:', Array.from(uniqueDurations));
  
  // 4. Download glTF version
  console.log('Downloading glTF...');
  const downloadPromiseGLTF = page.waitForEvent('download');
  
  // Go to conversion panel
  await page.goto('http://localhost:5173/PangeaRSEdit/#/');
  await page.waitForTimeout(2000);
  
  // Navigate to BG3D to GLB conversion
  const bg3dPanel = page.locator('text=BG3D to GLB').locator('..').locator('..');
  await expect(bg3dPanel).toBeVisible();
  
  // Upload Otto.bg3d file
  const fileInput = bg3dPanel.locator('input[type="file"]');
  await fileInput.setInputFiles(originalBg3dPath);
  
  const downloadGLTF = await downloadPromiseGLTF;
  const glbPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/test-results/otto_downloaded.glb';
  await downloadGLTF.saveAs(glbPath);
  
  console.log('Downloaded glTF file');
  
  // 5. Convert back to BG3D
  console.log('Converting GLB back to BG3D...');
  const downloadPromiseBG3D = page.waitForEvent('download');
  
  // Navigate to GLB to BG3D conversion
  const glbPanel = page.locator('text=GLB to BG3D').locator('..').locator('..');
  await expect(glbPanel).toBeVisible();
  
  // Upload the downloaded GLB file
  const glbFileInput = glbPanel.locator('input[type="file"]');
  await glbFileInput.setInputFiles(glbPath);
  
  const downloadBG3D = await downloadPromiseBG3D;
  const roundtripBg3dPath = '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/test-results/otto_roundtrip.bg3d';
  await downloadBG3D.saveAs(roundtripBg3dPath);
  
  console.log('Downloaded roundtrip BG3D file');
  
  // 6. Compare file sizes and content
  const roundtripBg3dData = readFileSync(roundtripBg3dPath);
  console.log(`Roundtrip BG3D size: ${roundtripBg3dData.length} bytes`);
  
  // Basic size comparison
  expect(Math.abs(roundtripBg3dData.length - originalBg3dData.length)).toBeLessThan(1000); // Allow some variance
  
  // Byte-by-byte comparison
  const originalArray = new Uint8Array(originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength));
  const roundtripArray = new Uint8Array(roundtripBg3dData.buffer.slice(roundtripBg3dData.byteOffset, roundtripBg3dData.byteOffset + roundtripBg3dData.byteLength));
  
  let mismatches = 0;
  const maxLength = Math.min(originalArray.length, roundtripArray.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (originalArray[i] !== roundtripArray[i]) {
      mismatches++;
    }
  }
  
  const accuracy = 1 - (mismatches / maxLength);
  console.log(`BG3D roundtrip accuracy: ${(accuracy * 100).toFixed(6)}% (${mismatches} mismatches out of ${maxLength} bytes)`);
  
  // We expect high accuracy - if it's 100%, great! If not, we need to investigate
  console.log(`Accuracy result: ${accuracy >= 0.99 ? 'EXCELLENT' : accuracy >= 0.95 ? 'GOOD' : 'POOR'}`);
  
  // Take final screenshot
  await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/screenshots/browser_roundtrip_complete.png', fullPage: true });
});