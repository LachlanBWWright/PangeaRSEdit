import { test, expect } from '@playwright/test';

test('Debug Otto Model Loading', async ({ page }) => {
  console.log('=== DEBUGGING OTTO MODEL LOADING ===');
  
  // Navigate to the model viewer
  await page.goto('http://localhost:5173/PangeaRSEdit/model-viewer');
  await page.waitForTimeout(2000);
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/otto-debug-initial.png', fullPage: true });
  console.log('✅ Initial screenshot captured');
  
  // Click the Otto skeleton button
  const ottoButton = page.locator('button:has-text("Load Otto.bg3d Sample Model (with Skeleton)")');
  await expect(ottoButton).toBeVisible();
  console.log('✅ Otto skeleton button found');
  
  await ottoButton.click();
  console.log('✅ Clicked Otto skeleton button');
  
  // Wait for model to load
  await page.waitForTimeout(3000);
  
  // Take screenshot after clicking
  await page.screenshot({ path: '/tmp/otto-debug-after-click.png', fullPage: true });
  console.log('✅ After-click screenshot captured');
  
  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Wait a bit more for any errors to surface
  await page.waitForTimeout(2000);
  
  console.log('Console errors found:', errors);
  
  // Check if download buttons are visible
  const glbButton = page.locator('button:has-text("Download as GLB")');
  const bg3dButton = page.locator('button:has-text("Download as BG3D")');
  
  console.log('GLB button visible:', await glbButton.isVisible());
  console.log('BG3D button visible:', await bg3dButton.isVisible());
  
  // Check if the canvas is present and has content
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  console.log('✅ 3D canvas is visible');
  
  // Check the canvas size to see if it's rendering
  const canvasBox = await canvas.boundingBox();
  console.log('Canvas size:', canvasBox);
  
  // Check if there are any WebGL contexts
  const webglContexts = await page.evaluate(() => {
    const canvases = document.querySelectorAll('canvas');
    const contexts = [];
    canvases.forEach((canvas, index) => {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      contexts.push({
        canvasIndex: index,
        width: canvas.width,
        height: canvas.height,
        hasWebGL: !!gl,
        contextAttributes: gl ? gl.getContextAttributes() : null
      });
    });
    return contexts;
  });
  
  console.log('WebGL contexts:', webglContexts);
  
  // Check if any actual model geometry is being rendered
  const modelInfo = await page.evaluate(() => {
    // Check if Three.js scene has any children
    const threeFiber = (window as any).__THREE__;
    if (threeFiber) {
      return {
        hasThreeFiber: true,
        sceneChildrenCount: threeFiber.scene?.children?.length || 0
      };
    }
    
    // Alternative check - look for GLTF data
    const gltfUrls = [];
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.textContent && script.textContent.includes('blob:')) {
        gltfUrls.push('Found blob URL in script');
      }
    });
    
    return {
      hasThreeFiber: false,
      gltfUrlsFound: gltfUrls.length
    };
  });
  
  console.log('Model info:', modelInfo);
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/otto-debug-final.png', fullPage: true });
  console.log('✅ Final screenshot captured');
  
  console.log('🔍 Debug complete - check screenshots in /tmp/');
});