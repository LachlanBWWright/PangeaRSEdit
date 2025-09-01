import { test, expect } from '@playwright/test';

test.describe('Otto Skeleton Model Loading', () => {
  test('should load Otto with skeleton without crashes and validate model appears', async ({ page }) => {
    // Start dev server navigation
    await page.goto('http://localhost:5174/PangeaRSEdit/');
    
    // Wait for the page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Look for Otto skeleton button
    const ottoSkeletonButton = page.locator('button', { hasText: 'Load Otto.bg3d Sample Model (with Skeleton)' });
    await expect(ottoSkeletonButton).toBeVisible({ timeout: 10000 });
    
    // Monitor console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Click the Otto skeleton button
    await ottoSkeletonButton.click();
    
    // Wait a bit for loading to complete
    await page.waitForTimeout(3000);
    
    // Take a screenshot to verify model appears
    await page.screenshot({ path: '/tmp/otto-skeleton-loaded.png' });
    
    // Verify download buttons appear (indicating successful load)
    const downloadGLBButton = page.locator('button', { hasText: 'Download as GLB' });
    const downloadBG3DButton = page.locator('button', { hasText: 'Download as BG3D' });
    
    await expect(downloadGLBButton).toBeVisible({ timeout: 5000 });
    await expect(downloadBG3DButton).toBeVisible({ timeout: 5000 });
    
    // Check for any critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Error') || 
      error.includes('crash') || 
      error.includes('failed') ||
      error.includes('NODE_SKIN_NO_SCENE')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    console.log('Test completed successfully - Otto skeleton model loaded without crashes');
  });
  
  test('should successfully download GLB file after loading Otto skeleton', async ({ page }) => {
    await page.goto('http://localhost:5174/PangeaRSEdit/');
    
    // Load Otto with skeleton
    const ottoSkeletonButton = page.locator('button', { hasText: 'Load Otto.bg3d Sample Model (with Skeleton)' });
    await ottoSkeletonButton.click();
    await page.waitForTimeout(2000);
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    const downloadGLBButton = page.locator('button', { hasText: 'Download as GLB' });
    await downloadGLBButton.click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('model.glb');
    
    // Save to check file size (should be ~490KB with skeleton vs ~96KB without)
    const downloadPath = '/tmp/downloaded-otto-skeleton.glb';
    await download.saveAs(downloadPath);
    
    // Verify file size is reasonable (should include skeleton data)
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(300000); // At least 300KB
    expect(stats.size).toBeLessThan(1000000);   // Less than 1MB
    
    console.log(`Downloaded GLB file size: ${stats.size} bytes`);
  });
});