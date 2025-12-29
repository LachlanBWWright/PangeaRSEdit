import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Verify Editor Is Working - Full Flow', () => {
  test('Home page loads and Otto Matic level loads successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:4173/PangeaRSEdit/');
    
    // Wait for home page to load
    await expect(page.getByText('Pangea Level Editor')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of home page
    await page.screenshot({ path: 'test-results/01-home-page-loaded.png', fullPage: true });
    
    // Verify Otto Matic card is visible
    await expect(page.getByRole('heading', { name: 'Otto Matic' })).toBeVisible();
    
    // Upload Otto Matic level file
    const filePath = path.join(__dirname, '../../src/assets/EarthFarm.ter.rsrc');
    const fileChooserPromise = page.waitForEvent('filechooser');
    
    // Click the first upload button (Otto Matic)
    await page.getByText('Upload Level Data (.ter.rsrc)').first().click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    // Wait for level to load - check for download button which indicates editor view
    await expect(page.getByText('Download Level Data')).toBeVisible({ timeout: 30000 });
    
    // Take screenshot of editor with level loaded
    await page.screenshot({ path: 'test-results/02-otto-matic-level-loaded.png', fullPage: true });
    
    // Verify canvases are present (editor has rendered)
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThanOrEqual(2); // Should have at least 2 canvases
    
    // Try downloading the level
    const downloadPromise = page.waitForEvent('download');
    await page.getByText('Download Level Data').click();
    const download = await downloadPromise;
    
    // Verify download worked
    expect(download.suggestedFilename()).toContain('.ter.rsrc');
    const downloadPath = await download.path();
    const fs = await import('fs/promises');
    const stats = await fs.stat(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB
    
    // Take screenshot after download
    await page.screenshot({ path: 'test-results/03-otto-matic-after-download.png', fullPage: true });
  });
});
