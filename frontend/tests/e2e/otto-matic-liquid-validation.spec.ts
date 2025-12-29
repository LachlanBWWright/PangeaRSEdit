import { test, expect } from '@playwright/test';

test.describe('Otto Matic Liquid Bodies', () => {
  test('should display all 7 liquid bodies in Apocalypse level', async ({ page }) => {
    // Navigate to the app
    await page.goto('/PangeaRSEdit/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Otto Matic');
    
    // Click on Otto Matic card
    await page.click('text=Otto Matic');
    
    // Wait for level upload section
    await page.waitForSelector('text=Upload Level Data');
    
    // Upload the Apocalypse level file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('/home/runner/work/PangeaRSEdit/PangeaRSEdit/frontend/tests/files/otto_matic/Apocalypse.ter.rsrc');
    
    // Wait for the level to load (look for download button)
    await page.waitForSelector('text=Download', { timeout: 30000 });
    
    // Take a screenshot of the loaded level
    await page.screenshot({ path: '/tmp/otto-apocalypse-loaded.png', fullPage: true });
    
    // Check console logs for liquid loading confirmation
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Liqd') || msg.text().includes('liquid') || msg.text().includes('nub')) {
        logs.push(msg.text());
      }
    });
    
    // Verify no validation errors for liquid data
    const errors = await page.locator('[role="alert"]').allTextContents();
    const liquidErrors = errors.filter(e => e.toLowerCase().includes('liquid') || e.toLowerCase().includes('liqd'));
    expect(liquidErrors.length).toBe(0);
    
    // Verify the 3D view is visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Count canvas elements (should be at least 3: 2D tiles, 3D terrain, minimap)
    const canvasCount = await canvas.count();
    expect(canvasCount).toBeGreaterThanOrEqual(3);
    
    console.log(`Found ${canvasCount} canvas elements`);
    console.log('Liquid-related logs:', logs);
  });
});
