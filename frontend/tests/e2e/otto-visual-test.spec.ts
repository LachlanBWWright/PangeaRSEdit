import { test, expect } from '@playwright/test';

test('Otto Model Visual Rendering Test', async ({ page }) => {
  console.log('=== OTTO MODEL VISUAL RENDERING TEST ===');
  
  // Monitor errors
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Navigate to the application
  await page.goto('/');
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot before loading model
  await page.screenshot({ path: '/tmp/before-otto-load.png', fullPage: true });
  
  // Click Otto with skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  await expect(ottoButton).toBeVisible();
  await ottoButton.click();
  
  // Wait for model to load completely
  await page.waitForTimeout(10000);
  
  // Take screenshot after loading
  await page.screenshot({ path: '/tmp/after-otto-load.png', fullPage: true });
  
  // Check if canvas is visible and has content
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  
  // Get canvas properties
  const canvasInfo = await canvas.evaluate((canvas) => {
    const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return {
      width: canvas.width,
      height: canvas.height,
      hasContext: !!ctx,
      contextType: ctx ? (ctx.constructor.name) : null,
      canvasStyle: window.getComputedStyle(canvas).display
    };
  });
  
  console.log('Canvas info:', canvasInfo);
  
  // Check for the specific WebGL error
  const webglErrors = errors.filter(error => error.includes('WebGL'));
  console.log('WebGL errors found:', webglErrors.length);
  webglErrors.forEach(error => console.log('  WebGL Error:', error));
  
  // Check if download buttons appeared (indicates successful loading)
  const glbButton = page.locator('button:has-text("Download as GLB")');
  const bg3dButton = page.locator('button:has-text("Download as BG3D")');
  
  const glbVisible = await glbButton.isVisible();
  const bg3dVisible = await bg3dButton.isVisible();
  
  console.log('Download buttons visible - GLB:', glbVisible, 'BG3D:', bg3dVisible);
  
  // Take final screenshot for comparison
  await page.screenshot({ path: '/tmp/final-otto-state.png', fullPage: true });
  
  // The model should load successfully even if there are WebGL context warnings
  expect(glbVisible).toBe(true);
  expect(bg3dVisible).toBe(true);
  expect(canvasInfo.hasContext).toBe(true);
  
  console.log('✅ Model loading test completed');
  console.log('📸 Screenshots saved to /tmp/ for visual inspection');
});