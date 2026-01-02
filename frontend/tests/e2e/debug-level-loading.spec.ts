/**
 * Test to verify rsrcdump-ts integration actually works
 */

import { test, expect } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Otto Matic level loads successfully with rsrcdump-ts', async ({ page }) => {
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  // Navigate
  await page.goto('http://localhost:5174/PangeaRSEdit/');
  await page.waitForLoadState('networkidle');

  console.log('\n=== Initial Page Load ===');
  console.log('Console messages:', consoleMessages.slice(0, 5));
  if (consoleErrors.length > 0) {
    console.log('Console ERRORS:', consoleErrors);
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-initial.png', fullPage: true });

  // Find Otto Matic
  const ottoCard = page.locator('text="Otto Matic"').first();
  await expect(ottoCard).toBeVisible({ timeout: 10000 });
  console.log('✓ Found Otto Matic card');

  // Upload level file
  const levelPath = join(__dirname, '../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc');
  const fileInput = page.locator('input[type="file"]').first();
  
  consoleMessages.length = 0;
  consoleErrors.length = 0;
  
  await fileInput.setInputFiles(levelPath);
  console.log('✓ File uploaded');
  
  // Wait for processing
  await page.waitForTimeout(5000);

  console.log('\n=== After File Upload ===');
  console.log('Console messages:', consoleMessages.join('\n'));
  if (consoleErrors.length > 0) {
    console.log('Console ERRORS:', consoleErrors.join('\n'));
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-after-upload.png', fullPage: true });

  // Check for specific error text on page
  const pageText = await page.textContent('body');
  if (pageText?.includes('Failed to parse')) {
    console.error('✗ Page shows "Failed to parse" error');
    console.log('Page excerpt:', pageText.substring(pageText.indexOf('Failed'), pageText.indexOf('Failed') + 200));
  }

  // Check if editor loaded
  const editorVisible = await page.locator('[data-testid="editor-view"]').isVisible({ timeout: 5000 }).catch(() => false);
  const canvasVisible = await page.locator('canvas').first().isVisible({ timeout: 5000 }).catch(() => false);
  
  console.log('Editor visible:', editorVisible);
  console.log('Canvas visible:', canvasVisible);

  if (!editorVisible && !canvasVisible) {
    throw new Error('Editor did not load - level parsing likely failed');
  }

  console.log('✓ Level loaded successfully');
});
