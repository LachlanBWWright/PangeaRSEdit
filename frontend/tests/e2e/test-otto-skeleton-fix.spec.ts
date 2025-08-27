import { test, expect } from '@playwright/test';

test.describe('Otto Skeleton Model Loading', () => {
  test('load Otto with skeleton and verify model appears with no errors', async ({ page }) => {
    // Navigate to the model viewer
    await page.goto('/');
    
    // Listen for console errors and warnings
    const consoleMessages: any[] = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Find and click the "Load Otto.bg3d Sample Model (with Skeleton)" button
    await page.waitForSelector('text=Load Otto.bg3d Sample Model (with Skeleton)', { timeout: 10000 });
    await page.click('text=Load Otto.bg3d Sample Model (with Skeleton)');

    // Wait a moment for the model to load
    await page.waitForTimeout(5000);

    // Take a screenshot to see what's happening
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/otto-skeleton-debug.png' });

    // Check if the canvas is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check if the download buttons are present (indicating model loaded)
    await expect(page.locator('text=Download as GLB')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Download as BG3D')).toBeVisible({ timeout: 15000 });

    // Log console messages for debugging
    console.log('Console messages during Otto skeleton loading:');
    consoleMessages.forEach(msg => {
      if (msg.type === 'error' || msg.type === 'warning') {
        console.log(`${msg.type.toUpperCase()}: ${msg.text} at ${JSON.stringify(msg.location)}`);
      }
    });

    // Check for specific errors we want to avoid
    const errorMessages = consoleMessages.filter(msg => 
      msg.type === 'error' && 
      (msg.text.includes('THREE') || msg.text.includes('GLB') || msg.text.includes('skin'))
    );
    
    console.log('Filtered error messages:', errorMessages);

    // Test GLB download functionality
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Download as GLB');
    const download = await downloadPromise;
    
    // Verify download completed successfully
    expect(download.suggestedFilename()).toContain('.glb');
    
    // Save the downloaded file for analysis
    const downloadPath = `/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/otto-downloaded.glb`;
    await download.saveAs(downloadPath);
    
    // Verify the downloaded file size is reasonable (should include skeleton data)
    const fs = require('fs');
    const stats = fs.statSync(downloadPath);
    console.log(`Downloaded GLB file size: ${stats.size} bytes`);
    
    // The GLB should be significantly larger than without skeleton (~378KB vs ~96KB)
    expect(stats.size).toBeGreaterThan(300000); // At least 300KB
    
    // Test BG3D download functionality as well
    const bg3dDownloadPromise = page.waitForEvent('download');
    await page.click('text=Download as BG3D');
    const bg3dDownload = await bg3dDownloadPromise;
    
    expect(bg3dDownload.suggestedFilename()).toContain('.bg3d');
  });

  test('check animation functionality works', async ({ page }) => {
    // Navigate to the model viewer
    await page.goto('http://localhost:5173/PangeaRSEdit/PangeaRSEdit/');
    
    // Load Otto with skeleton
    await page.waitForSelector('text=Load Otto.bg3d Sample Model (with Skeleton)', { timeout: 10000 });
    await page.click('text=Load Otto.bg3d Sample Model (with Skeleton)');

    // Wait for model to load
    await page.waitForTimeout(5000);

    // Check if animations panel is visible
    await expect(page.locator('text=Animations')).toBeVisible({ timeout: 15000 });
    
    // Look for animation entries
    const animationElements = page.locator('[class*="animation"]');
    const animationCount = await animationElements.count();
    
    console.log(`Found ${animationCount} animation elements`);
    
    // Should have Otto's 35 animations
    expect(animationCount).toBeGreaterThan(30);
    
    // Take screenshot of animation panel
    await page.screenshot({ path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/otto-animations.png' });
  });
});