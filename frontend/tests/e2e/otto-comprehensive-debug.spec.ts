import { test, expect } from '@playwright/test';

test('Otto Model Complete Debugging', async ({ page }) => {
  console.log('=== COMPREHENSIVE OTTO MODEL DEBUGGING ===');
  
  // Set up console monitoring from the start
  const consoleMessages: string[] = [];
  const errors: string[] = [];
  
  page.on('console', msg => {
    const text = `${msg.type()}: ${msg.text()}`;
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });
  
  // Navigate to the application
  await page.goto('/');
  console.log('✅ Navigated to homepage');
  
  // Go to Model Viewer
  await page.click('text=Model Viewer');
  await page.waitForLoadState('networkidle');
  console.log('✅ Navigated to Model Viewer');
  
  // Take initial screenshot
  await page.screenshot({ path: '/tmp/comprehensive-initial.png', fullPage: true });
  console.log('✅ Initial screenshot captured');
  
  // Find and click the Otto skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  await expect(ottoButton).toBeVisible();
  console.log('✅ Otto skeleton button found');
  
  await ottoButton.click();
  console.log('✅ Clicked Otto skeleton button');
  
  // Wait for the model to load
  console.log('⏳ Waiting for model to load...');
  await page.waitForTimeout(10000);
  
  // Take screenshot after loading
  await page.screenshot({ path: '/tmp/comprehensive-after-load.png', fullPage: true });
  console.log('✅ Post-load screenshot captured');
  
  // Check for download buttons
  const glbButton = page.locator('button:has-text("Download as GLB")');
  const bg3dButton = page.locator('button:has-text("Download as BG3D")');
  
  const glbVisible = await glbButton.isVisible();
  const bg3dVisible = await bg3dButton.isVisible();
  
  console.log('GLB button visible:', glbVisible);
  console.log('BG3D button visible:', bg3dVisible);
  
  // Check canvas presence and properties
  const canvas = page.locator('canvas');
  const canvasVisible = await canvas.isVisible();
  console.log('Canvas visible:', canvasVisible);
  
  if (canvasVisible) {
    const canvasBox = await canvas.boundingBox();
    console.log('Canvas dimensions:', canvasBox);
    
    // Check canvas context and rendering info
    const canvasInfo = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const info = [];
      
      canvases.forEach((canvas, index) => {
        const ctx = canvas.getContext('webgl') || canvas.getContext('webgl2');
        const rect = canvas.getBoundingClientRect();
        
        info.push({
          index,
          width: canvas.width,
          height: canvas.height,
          displayWidth: rect.width,
          displayHeight: rect.height,
          hasWebGL: !!ctx,
          pixelRatio: window.devicePixelRatio || 1
        });
      });
      
      return info;
    });
    
    console.log('Canvas info:', JSON.stringify(canvasInfo, null, 2));
  }
  
  // Try downloading GLB to test the workflow
  if (glbVisible) {
    console.log('🔽 Testing GLB download...');
    
    // Listen for download
    const downloadPromise = page.waitForEvent('download');
    await glbButton.click();
    
    try {
      const download = await downloadPromise;
      const downloadPath = await download.path();
      const stats = await require('fs').promises.stat(downloadPath);
      console.log('✅ GLB downloaded successfully, size:', stats.size, 'bytes');
      
      // Basic GLB validation - check if it starts with glTF magic number
      const buffer = await require('fs').promises.readFile(downloadPath);
      const magic = buffer.toString('ascii', 0, 4);
      console.log('GLB magic number:', magic, '(should be "glTF")');
      
    } catch (e) {
      console.log('❌ GLB download failed:', e.message);
    }
  }
  
  // Check for animation information
  const animationText = await page.locator('[class*="animation"], [data-testid*="animation"]').allTextContents();
  console.log('Animation UI elements found:', animationText);
  
  // Log all console messages
  console.log('=== CONSOLE MESSAGES ===');
  consoleMessages.forEach((msg, index) => {
    console.log(`${index + 1}: ${msg}`);
  });
  
  // Log errors separately
  if (errors.length > 0) {
    console.log('=== ERRORS DETECTED ===');
    errors.forEach((error, index) => {
      console.log(`${index + 1}: ${error}`);
    });
  } else {
    console.log('✅ No errors detected');
  }
  
  // Take final screenshot
  await page.screenshot({ path: '/tmp/comprehensive-final.png', fullPage: true });
  console.log('✅ Final screenshot captured');
  
  console.log('🔍 Debug complete - check screenshots and logs above');
});