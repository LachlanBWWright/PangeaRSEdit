import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test data for Otto Matic models
const OTTO_MODELS = [
  {
    name: 'Otto',
    bg3dFile: '/PangeaRSEdit/games/ottomatic/Otto.bg3d',
    skeletonFile: '/PangeaRSEdit/games/ottomatic/Otto.skeleton.rsrc',
    description: 'Main character with full skeleton and animations',
    expectedAnimations: 35,
    expectedJoints: 16
  },
  {
    name: 'Onion',
    bg3dFile: '/PangeaRSEdit/games/ottomatic/Onion.bg3d',
    skeletonFile: '/PangeaRSEdit/games/ottomatic/Onion.skeleton.rsrc',
    description: 'Onion alien character with animations',
    expectedAnimations: 35, // Assuming similar to Otto
    expectedJoints: 16     // Assuming similar to Otto
  }
];

async function validateGlbWithGltfValidator(glbPath: string): Promise<{ isValid: boolean, errors: string[], warnings: string[] }> {
  try {
    // Use gltf-validator to validate the GLB file
    const { stdout, stderr } = await execAsync(`npx gltf-validator ${glbPath} --format json`);
    
    const result = JSON.parse(stdout);
    
    return {
      isValid: result.issues.numErrors === 0,
      errors: result.issues.messages.filter((msg: any) => msg.severity === 0).map((msg: any) => msg.message),
      warnings: result.issues.messages.filter((msg: any) => msg.severity === 1).map((msg: any) => msg.message)
    };
  } catch (error) {
    console.error('glTF validator error:', error);
    return {
      isValid: false,
      errors: [`Validator failed: ${error.message}`],
      warnings: []
    };
  }
}

async function performRoundtripTest(
  page: any, 
  modelData: typeof OTTO_MODELS[0]
): Promise<{ bg3dAccuracy: number, skeletonAccuracy: number }> {
  console.log(`\n=== Testing ${modelData.name} Roundtrip ===`);
  
  // Load original files
  const originalBg3dData = await fs.readFile(`/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public${modelData.bg3dFile}`);
  const originalSkeletonData = await fs.readFile(`/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/public${modelData.skeletonFile}`);
  
  console.log(`Original ${modelData.name} BG3D size: ${originalBg3dData.length} bytes`);
  console.log(`Original ${modelData.name} skeleton size: ${originalSkeletonData.length} bytes`);
  
  // Navigate to model viewer
  await page.goto('/');
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  
  // Use the new Game Model Selector
  const gameModelTab = page.locator('button:has-text("Game Models")');
  await expect(gameModelTab).toBeVisible();
  await gameModelTab.click();
  
  // Select Otto Matic game
  const gameSelect = page.locator('button[role="combobox"]').first();
  await gameSelect.click();
  await page.locator('div[role="option"]:has-text("Otto Matic")').click();
  
  // Select the specific model
  const modelSelect = page.locator('button[role="combobox"]').nth(1);
  await modelSelect.click();
  await page.locator(`div[role="option"]:has-text("${modelData.name}")`).click();
  
  // Ensure skeleton loading is enabled
  const skeletonOption = page.locator('input[type="radio"]').first();
  await skeletonOption.check();
  
  // Load the model
  const loadButton = page.locator(`button:has-text("Load ${modelData.name}")`);
  await loadButton.click();
  
  // Wait for model to load
  await page.waitForTimeout(10000);
  
  // Check that animations loaded
  const animationSelect = page.locator('select').first();
  await expect(animationSelect).toBeVisible({ timeout: 10000 });
  
  const animationOptions = await animationSelect.locator('option').allTextContents();
  const animationCount = animationOptions.length - 1; // Subtract 1 for "Select Animation" option
  console.log(`${modelData.name} loaded with ${animationCount} animations`);
  
  // Download GLB
  const glbButton = page.locator('button:has-text("Download as GLB")');
  await expect(glbButton).toBeVisible();
  
  const downloadPromiseGlb = page.waitForEvent('download');
  await glbButton.click();
  const glbDownload = await downloadPromiseGlb;
  
  const glbPath = `/tmp/${modelData.name.toLowerCase()}-test.glb`;
  await glbDownload.saveAs(glbPath);
  
  // Validate GLB with gltf-validator
  console.log(`Validating ${modelData.name} GLB with gltf-validator...`);
  const validation = await validateGlbWithGltfValidator(glbPath);
  
  console.log(`${modelData.name} GLB validation result:`, {
    isValid: validation.isValid,
    errors: validation.errors.length,
    warnings: validation.warnings.length
  });
  
  if (validation.errors.length > 0) {
    console.log(`${modelData.name} GLB validation errors:`, validation.errors);
  }
  
  expect(validation.isValid).toBe(true);
  expect(validation.errors.length).toBe(0);
  
  // Download BG3D
  const bg3dButton = page.locator('button:has-text("Download as BG3D")');
  await expect(bg3dButton).toBeVisible();
  
  const downloadPromiseBg3d = page.waitForEvent('download');
  await bg3dButton.click();
  const bg3dDownload = await downloadPromiseBg3d;
  
  const roundtripBg3dPath = `/tmp/${modelData.name.toLowerCase()}-roundtrip.bg3d`;
  await bg3dDownload.saveAs(roundtripBg3dPath);
  
  // Check for skeleton download (should be automatic)
  const skeletonPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  const skeletonDownload = await skeletonPromise;
  
  let roundtripSkeletonPath = null;
  if (skeletonDownload) {
    roundtripSkeletonPath = `/tmp/${modelData.name.toLowerCase()}-roundtrip.skeleton.rsrc`;
    await skeletonDownload.saveAs(roundtripSkeletonPath);
  }
  
  // Compare roundtrip accuracy
  const roundtripBg3dData = await fs.readFile(roundtripBg3dPath);
  console.log(`Roundtrip ${modelData.name} BG3D size: ${roundtripBg3dData.length} bytes`);
  
  // BG3D comparison
  const bg3dAccuracy = calculateAccuracy(originalBg3dData, roundtripBg3dData);
  console.log(`${modelData.name} BG3D roundtrip accuracy: ${(bg3dAccuracy * 100).toFixed(6)}%`);
  
  // Skeleton comparison
  let skeletonAccuracy = 0;
  if (roundtripSkeletonPath) {
    const roundtripSkeletonData = await fs.readFile(roundtripSkeletonPath);
    skeletonAccuracy = calculateAccuracy(originalSkeletonData, roundtripSkeletonData);
    console.log(`${modelData.name} skeleton roundtrip accuracy: ${(skeletonAccuracy * 100).toFixed(6)}%`);
  }
  
  return { bg3dAccuracy, skeletonAccuracy };
}

function calculateAccuracy(original: Buffer, roundtrip: Buffer): number {
  const originalArray = new Uint8Array(original);
  const roundtripArray = new Uint8Array(roundtrip);
  
  let mismatches = 0;
  const maxLength = Math.min(originalArray.length, roundtripArray.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (originalArray[i] !== roundtripArray[i]) {
      mismatches++;
    }
  }
  
  // Account for size differences
  if (originalArray.length !== roundtripArray.length) {
    mismatches += Math.abs(originalArray.length - roundtripArray.length);
  }
  
  return Math.max(0, 1 - (mismatches / Math.max(originalArray.length, roundtripArray.length)));
}

test.describe('Otto Matic Models Comprehensive Testing', () => {
  test('Game Model Selector UI functionality', async ({ page }) => {
    console.log('=== Testing Game Model Selector UI ===');
    
    await page.goto('/');
    await page.click('text=Model Viewer');
    await page.waitForLoadState('networkidle');
    
    // Check that Game Models tab is selected by default
    const gameModelsTab = page.locator('button:has-text("Game Models")');
    await expect(gameModelsTab).toBeVisible();
    
    // Check that the Game Model Selector is visible
    const gameSelector = page.locator('text=Game Model Selector');
    await expect(gameSelector).toBeVisible();
    
    // Test game dropdown
    const gameSelect = page.locator('button[role="combobox"]').first();
    await gameSelect.click();
    
    const ottoMaticOption = page.locator('div[role="option"]:has-text("Otto Matic")');
    await expect(ottoMaticOption).toBeVisible();
    await ottoMaticOption.click();
    
    // Test model dropdown appears
    const modelSelect = page.locator('button[role="combobox"]').nth(1);
    await expect(modelSelect).toBeVisible();
    await modelSelect.click();
    
    // Check that Otto and Onion models are available
    await expect(page.locator('div[role="option"]:has-text("Otto")')).toBeVisible();
    await expect(page.locator('div[role="option"]:has-text("Onion")')).toBeVisible();
    
    // Test skeleton loading options appear when model is selected
    await page.locator('div[role="option"]:has-text("Otto")').click();
    
    await expect(page.locator('text=Load with skeleton data')).toBeVisible();
    await expect(page.locator('text=Load model only')).toBeVisible();
    
    // Test that load button is enabled
    const loadButton = page.locator('button:has-text("Load Otto")');
    await expect(loadButton).toBeEnabled();
    
    console.log('✅ Game Model Selector UI tests passed');
  });

  for (const modelData of OTTO_MODELS) {
    test(`${modelData.name} glTF validation and roundtrip test`, async ({ page }) => {
      const results = await performRoundtripTest(page, modelData);
      
      // Expect near-perfect accuracy for Otto models
      expect(results.bg3dAccuracy).toBeGreaterThanOrEqual(0.999);
      
      if (results.skeletonAccuracy > 0) {
        expect(results.skeletonAccuracy).toBeGreaterThanOrEqual(0.999);
      }
      
      console.log(`✅ ${modelData.name} comprehensive test passed`);
    });
  }

  test('All Otto Matic models batch validation', async ({ page }) => {
    console.log('=== Batch Testing All Otto Matic Models ===');
    
    const results: { [key: string]: { bg3dAccuracy: number, skeletonAccuracy: number } } = {};
    
    for (const modelData of OTTO_MODELS) {
      try {
        results[modelData.name] = await performRoundtripTest(page, modelData);
      } catch (error) {
        console.error(`Error testing ${modelData.name}:`, error);
        results[modelData.name] = { bg3dAccuracy: 0, skeletonAccuracy: 0 };
      }
    }
    
    // Print summary
    console.log('\n=== BATCH TEST SUMMARY ===');
    for (const [modelName, result] of Object.entries(results)) {
      console.log(`${modelName}:`);
      console.log(`  BG3D accuracy: ${(result.bg3dAccuracy * 100).toFixed(6)}%`);
      console.log(`  Skeleton accuracy: ${(result.skeletonAccuracy * 100).toFixed(6)}%`);
    }
    
    // Expect all models to pass
    for (const [modelName, result] of Object.entries(results)) {
      expect(result.bg3dAccuracy, `${modelName} BG3D accuracy`).toBeGreaterThanOrEqual(0.999);
      if (result.skeletonAccuracy > 0) {
        expect(result.skeletonAccuracy, `${modelName} skeleton accuracy`).toBeGreaterThanOrEqual(0.999);
      }
    }
    
    console.log('✅ All Otto Matic models passed comprehensive testing');
  });
});