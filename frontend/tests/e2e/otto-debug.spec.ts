import { test, expect } from '@playwright/test';

test('Debug Otto model loading', async ({ page }) => {
  console.log('Starting Otto debug test...');
  
  // Navigate to the application
  await page.goto('/');
  
  // Take initial screenshot
  await page.screenshot({ path: 'screenshots/otto-debug-initial.png', fullPage: true });
  
  // Look for Model Viewer link
  await page.click('text=Model Viewer');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of model viewer page
  await page.screenshot({ path: 'screenshots/otto-debug-model-viewer.png', fullPage: true });
  
  // Look for Otto with skeleton button
  const ottoButton = page.locator('text=Load Otto.bg3d Sample Model (with Skeleton)');
  
  if (await ottoButton.isVisible()) {
    console.log('Otto button found, clicking...');
    
    // Set up console listener to catch errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      consoleMessages.push(message);
      console.log('Browser console:', message);
    });
    
    // Set up error listener
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('Page error:', error.message);
    });
    
    // Click the Otto button
    await ottoButton.click();
    
    // Wait a bit for processing
    await page.waitForTimeout(10000);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'screenshots/otto-debug-after-click.png', fullPage: true });
    
    // Check if there are download buttons
    const downloadButtons = await page.locator('button').filter({ hasText: /download/i }).count();
    console.log('Download buttons found:', downloadButtons);
    
    // Look for any GLB download button specifically
    const glbDownloadButton = page.locator('button:has-text("Download as GLB")');
    const bg3dDownloadButton = page.locator('button:has-text("Download as BG3D")');
    
    console.log('GLB download visible:', await glbDownloadButton.isVisible());
    console.log('BG3D download visible:', await bg3dDownloadButton.isVisible());
    
    // Test downloading GLB if button is available
    if (await glbDownloadButton.isVisible()) {
      console.log('GLB download button is available - testing functionality...');
      
      // Just click to test it doesn't crash, don't wait for download
      await glbDownloadButton.click();
      await page.waitForTimeout(2000); // Wait for any processing
      console.log('GLB download clicked successfully');
    }
    
    // Test downloading BG3D if button is available
    if (await bg3dDownloadButton.isVisible()) {
      console.log('BG3D download button is available - testing functionality...');
      
      // Just click to test it doesn't crash, don't wait for download
      await bg3dDownloadButton.click();
      await page.waitForTimeout(2000); // Wait for any processing
      console.log('BG3D download clicked successfully');
    }
    
    // Log final state
    console.log('Final console messages count:', consoleMessages.length);
    console.log('Final page errors count:', pageErrors.length);
    
    if (pageErrors.length > 0) {
      console.log('Page errors detected:', pageErrors);
    }
    
  } else {
    console.log('Otto button not found');
    await page.screenshot({ path: 'screenshots/otto-debug-no-button.png', fullPage: true });
  }
});