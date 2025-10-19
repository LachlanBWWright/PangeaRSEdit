import { test, expect } from '@playwright/test';

test.describe('Otto Skeleton - Simple Validation', () => {
  test('verify Otto loads with no THREE.js PropertyBinding errors', async ({ page }) => {
    // Navigate to the model viewer
    await page.goto('/');
    
    // Track console messages
    const consoleMessages: any[] = [];
    const errorMessages: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text: text
      });
      
      // Track any THREE.js or PropertyBinding errors
      if (msg.type() === 'error' && 
          (text.includes('THREE') || 
           text.includes('PropertyBinding') || 
           text.includes('No target node found'))) {
        errorMessages.push(text);
      }
    });

    // Click Model Viewer tab
    await page.waitForSelector('text=Model Viewer', { timeout: 10000 });
    await page.click('text=Model Viewer');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click Game Models button
    await page.waitForSelector('text=Game Models', { timeout: 10000 });
    await page.click('text=Game Models');
    
    // Wait for UI
    await page.waitForTimeout(1000);

    // Load Otto with skeleton
    await page.waitForSelector('text=Load Otto.bg3d Sample Model (with Skeleton)', { timeout: 10000 });
    await page.click('text=Load Otto.bg3d Sample Model (with Skeleton)');

    // Wait for model to load
    await page.waitForTimeout(5000);

    // Check if the canvas is present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check if download buttons appeared (model loaded successfully)
    await expect(page.locator('text=Download as GLB')).toBeVisible({ timeout: 15000 });

    // Take screenshot
    await page.screenshot({ 
      path: '/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/screenshots/otto-simple-test.png',
      fullPage: true 
    });

    // Print console messages
    console.log('\n=== CONSOLE MESSAGES ===');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Error messages: ${errorMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('\n=== THREE.js / PropertyBinding ERRORS ===');
      errorMessages.forEach(msg => console.log(`ERROR: ${msg}`));
    } else {
      console.log('\n✅ NO THREE.js PropertyBinding errors found!');
    }

    // Assert no PropertyBinding errors
    expect(errorMessages.length).toBe(0);
  });
});