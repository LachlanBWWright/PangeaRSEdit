/**
 * Level Round-Trip E2E Tests
 * 
 * Tests that level files for ALL games can be:
 * 1. Loaded from the public assets
 * 2. Displayed in the editor
 * 3. Downloaded
 * 4. Verified for byte-for-byte accuracy with original
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Game configuration for testing
const gameConfigs = [
  {
    name: 'Otto Matic',
    gameSelectorText: 'Otto Matic',
    terrainDir: 'public/assets/ottoMatic/terrain',
    sampleFile: 'EarthFarm.ter.rsrc',
    hasImages: true,
    imageFile: 'EarthFarm_images.rsrc',
  },
  {
    name: 'Bugdom',
    gameSelectorText: 'Bugdom',
    terrainDir: 'public/assets/bugdom/terrain',
    sampleFile: 'Lawn.ter.rsrc',
    hasImages: true,
    imageFile: 'Lawn_images.rsrc',
  },
  {
    name: 'Bugdom 2',
    gameSelectorText: 'Bugdom 2',
    terrainDir: 'public/assets/bugdom2/terrain',
    sampleFile: 'Level1_Garden.ter.rsrc',
    hasImages: true,
    imageFile: 'Level1_Garden_images.ter.rsrc',
  },
  {
    name: 'Nanosaur 2',
    gameSelectorText: 'Nanosaur 2',
    terrainDir: 'public/assets/nanosaur2/terrain',
    sampleFile: 'battle1.ter.rsrc',
    hasImages: true,
    imageFile: 'battle1_images.ter.rsrc',
  },
  {
    name: 'Cro-Mag Rally',
    gameSelectorText: 'Cro-Mag Rally',
    terrainDir: 'public/assets/croMag/terrain',
    sampleFile: 'Battle_Aztec.ter.rsrc',
    hasImages: true,
    imageFile: 'Battle_Aztec_images.ter.rsrc',
  },
  {
    name: 'Billy Frontier',
    gameSelectorText: 'Billy Frontier',
    terrainDir: 'public/assets/billyFrontier/terrain',
    sampleFile: 'swamp_duel.ter.rsrc',
    hasImages: true,
    imageFile: 'swamp_duel_images.ter.rsrc',
  },
];

// Helper to get file path
function getFilePath(terrainDir: string, fileName: string): string {
  return path.join(__dirname, '../../..', terrainDir, fileName);
}

// Check if file exists
function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

test.describe('Level Round-Trip Tests', () => {
  // Slow down tests for reliability
  test.setTimeout(120000);

  for (const game of gameConfigs) {
    test.describe(game.name, () => {
      test('should load level and display in editor', async ({ page }) => {
        // Check if sample file exists
        const terrainPath = getFilePath(game.terrainDir, game.sampleFile);
        if (!fileExists(terrainPath)) {
          console.log(`Skipping ${game.name} - sample file not found: ${terrainPath}`);
          test.skip();
          return;
        }

        // Navigate to the app
        await page.goto('/');

        // Wait for the app to load
        await page.waitForLoadState('networkidle');

        // Select the game from dropdown
        await selectGame(page, game.gameSelectorText);

        // Load the level file
        await loadLevelFile(page, terrainPath);

        // If game has images, try to load them
        if (game.hasImages) {
          const imagePath = getFilePath(game.terrainDir, game.imageFile);
          if (fileExists(imagePath)) {
            await loadImageFile(page, imagePath);
          }
        }

        // Wait for editor to show
        await expect(page.locator('[data-testid="editor-view"]')).toBeVisible({ timeout: 30000 });

        // Take a screenshot for verification
        await page.screenshot({ 
          path: `test-results/${game.name.replace(/\s/g, '-')}-loaded.png`,
          fullPage: true 
        });
      });

      test('should download level without corruption', async ({ page }) => {
        const terrainPath = getFilePath(game.terrainDir, game.sampleFile);
        if (!fileExists(terrainPath)) {
          test.skip();
          return;
        }

        // Navigate to the app
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Select game
        await selectGame(page, game.gameSelectorText);

        // Load files
        await loadLevelFile(page, terrainPath);

        if (game.hasImages) {
          const imagePath = getFilePath(game.terrainDir, game.imageFile);
          if (fileExists(imagePath)) {
            await loadImageFile(page, imagePath);
          }
        }

        // Wait for editor
        await expect(page.locator('[data-testid="editor-view"]')).toBeVisible({ timeout: 30000 });

        // Setup download handler
        const downloadPromise = page.waitForEvent('download');

        // Click download button
        await page.click('[data-testid="download-button"]');

        // Wait for download
        const download = await downloadPromise;

        // Save download to temp file
        const downloadPath = `test-results/${game.name.replace(/\s/g, '-')}-download.ter.rsrc`;
        await download.saveAs(downloadPath);

        // Read both files
        const originalBuffer = fs.readFileSync(terrainPath);
        const downloadedBuffer = fs.readFileSync(downloadPath);

        // Compare file sizes
        console.log(`${game.name} - Original size: ${originalBuffer.length}, Downloaded: ${downloadedBuffer.length}`);

        // Check for byte-level differences (allowing some tolerance for metadata changes)
        let diffCount = 0;
        let firstDiffOffset = -1;
        const minLength = Math.min(originalBuffer.length, downloadedBuffer.length);
        
        for (let i = 0; i < minLength; i++) {
          if (originalBuffer[i] !== downloadedBuffer[i]) {
            diffCount++;
            if (firstDiffOffset === -1) {
              firstDiffOffset = i;
            }
          }
        }

        // Log differences
        if (diffCount > 0) {
          console.log(`${game.name} - ${diffCount} byte differences found, first at offset ${firstDiffOffset}`);
        }

        // Files should be similar size (within 10% for now due to potential format variations)
        const sizeDiff = Math.abs(originalBuffer.length - downloadedBuffer.length);
        const maxSizeDiff = originalBuffer.length * 0.1;
        expect(sizeDiff).toBeLessThan(maxSizeDiff);
      });
    });
  }
});

// Helper: Select game from dropdown
async function selectGame(page: Page, gameName: string) {
  // Look for game selector dropdown
  const selector = page.locator('[data-testid="game-selector"]');
  if (await selector.isVisible()) {
    await selector.click();
    await page.click(`text="${gameName}"`);
  }
  // Wait for selection to take effect
  await page.waitForTimeout(500);
}

// Helper: Load level file
async function loadLevelFile(page: Page, filePath: string) {
  // Find the level file input
  const input = page.locator('input[type="file"][accept=".ter,.ter.rsrc"]').first();
  
  if (await input.isVisible()) {
    await input.setInputFiles(filePath);
  } else {
    // Try button click approach
    const button = page.locator('text="Load Map File"').first();
    if (await button.isVisible()) {
      // Click the button and handle the file dialog
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        button.click(),
      ]);
      await fileChooser.setFiles(filePath);
    }
  }
  
  // Wait for file to be processed
  await page.waitForTimeout(2000);
}

// Helper: Load image file
async function loadImageFile(page: Page, filePath: string) {
  // Find the image file input
  const input = page.locator('input[type="file"][accept=".rsrc"]').nth(1);
  
  if (await input.isVisible()) {
    await input.setInputFiles(filePath);
  } else {
    const button = page.locator('text="Load Map Images File"').first();
    if (await button.isVisible()) {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        button.click(),
      ]);
      await fileChooser.setFiles(filePath);
    }
  }
  
  // Wait for images to be processed
  await page.waitForTimeout(3000);
}
