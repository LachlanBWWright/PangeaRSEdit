import { test, expect } from '@playwright/test';
import fs from 'fs';

test('Load Otto model with skeleton and test UI', async ({ page }) => {
  // Set up console error tracking
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[Browser ${msg.type().toUpperCase()}]:`, text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(text);
    }
  });

  // Navigate to the Model Viewer
  await page.goto('/');
  await page.click('a:has-text("Model Viewer")');
  
  // Wait for the page to load
  await page.waitForSelector('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  
  console.log('Page loaded successfully');

  // Click the Otto with skeleton button
  await page.click('button:has-text("Otto.bg3d Sample Model (with Skeleton)")');
  
  // Wait a few seconds for the model to load
  await page.waitForTimeout(5000);
  
  // Take a screenshot to see what happened
  await page.screenshot({ path: '/tmp/otto-skeleton-test.png', fullPage: true });
  
  // Check for any console errors
  console.log('Console errors:', consoleErrors);
  console.log('Console warnings:', consoleWarnings);
  
  // Try to see if the model loaded - look for the download buttons
  const downloadGlbButton = page.locator('button:has-text("Download as GLB")');
  const downloadBg3dButton = page.locator('button:has-text("Download as BG3D")');
  
  await expect(downloadGlbButton).toBeVisible({ timeout: 10000 });
  await expect(downloadBg3dButton).toBeVisible({ timeout: 10000 });
  
  console.log('Download buttons are visible');
  
  // Test download functionality
  const downloadPromise1 = page.waitForEvent('download');
  await downloadGlbButton.click();
  const download1 = await downloadPromise1;
  
  const downloadPromise2 = page.waitForEvent('download');
  await downloadBg3dButton.click();
  const download2 = await downloadPromise2;
  
  console.log('Downloads completed');
  console.log('GLB download path:', await download1.path());
  console.log('BG3D download path:', await download2.path());
  
  // Verify download files exist and have reasonable sizes
  const glbPath = await download1.path();
  const bg3dPath = await download2.path();
  
  if (glbPath && bg3dPath) {
    const glbSize = fs.statSync(glbPath).size;
    const bg3dSize = fs.statSync(bg3dPath).size;
    
    console.log(`GLB file size: ${glbSize} bytes`);
    console.log(`BG3D file size: ${bg3dSize} bytes`);
    
    // Verify files have reasonable sizes
    expect(glbSize).toBeGreaterThan(1000);  // At least 1KB
    expect(bg3dSize).toBeGreaterThan(1000); // At least 1KB
  }
  
  // Final screenshot
  await page.screenshot({ path: '/tmp/otto-skeleton-final.png', fullPage: true });
});