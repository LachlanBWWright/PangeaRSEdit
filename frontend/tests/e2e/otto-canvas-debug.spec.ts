import { test, expect } from '@playwright/test';

test('Otto Canvas Debug Test', async ({ page }) => {
  console.log('=== OTTO CANVAS DEBUG TEST ===');
  
  // Navigate to the application
  await page.goto('/');
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  
  // Check initial canvas state
  let canvasCount = await page.locator('canvas').count();
  console.log('Canvas elements before loading:', canvasCount);
  
  // Click Otto with skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  await ottoButton.click();
  
  // Monitor canvas changes during loading
  await page.waitForTimeout(2000);
  canvasCount = await page.locator('canvas').count();
  console.log('Canvas elements during loading:', canvasCount);
  
  await page.waitForTimeout(6000);
  canvasCount = await page.locator('canvas').count();
  console.log('Canvas elements after loading:', canvasCount);
  
  // Get detailed info about all canvas elements
  const canvasDetails = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    return Array.from(canvases).map((canvas, index) => {
      const webgl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
      const webgl2 = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
      const ctx2d = canvas.getContext('2d');
      
      return {
        index,
        id: canvas.id,
        className: canvas.className,
        width: canvas.width,
        height: canvas.height,
        parent: canvas.parentElement?.tagName,
        hasWebGL: !!webgl,
        hasWebGL2: !!webgl2,
        has2D: !!ctx2d,
        style: {
          display: window.getComputedStyle(canvas).display,
          position: window.getComputedStyle(canvas).position,
          zIndex: window.getComputedStyle(canvas).zIndex
        }
      };
    });
  });
  
  console.log('Canvas details:');
  canvasDetails.forEach((canvas, index) => {
    console.log(`  Canvas ${index}:`, JSON.stringify(canvas, null, 4));
  });
  
  // Check for React Three Fiber specific elements
  const r3fElements = await page.evaluate(() => {
    // Look for React Three Fiber canvas container
    const r3fCanvas = document.querySelector('[data-r3f]');
    const threeCanvas = document.querySelector('canvas[data-engine]');
    
    return {
      hasR3FCanvas: !!r3fCanvas,
      hasThreeCanvas: !!threeCanvas,
      r3fAttributes: r3fCanvas ? Array.from(r3fCanvas.attributes).map(attr => `${attr.name}=${attr.value}`) : [],
      threeAttributes: threeCanvas ? Array.from(threeCanvas.attributes).map(attr => `${attr.name}=${attr.value}`) : []
    };
  });
  
  console.log('R3F Elements:', r3fElements);
  
  // Take screenshot for visual inspection
  await page.screenshot({ path: '/tmp/canvas-debug.png', fullPage: true });
  
  console.log('🔍 Canvas debug complete');
});