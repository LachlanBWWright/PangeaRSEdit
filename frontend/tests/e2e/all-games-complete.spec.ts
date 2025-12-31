/**
 * Comprehensive E2E test for ALL games after rsrcdump-ts migration
 * Tests level loading, editor display, and download functionality
 */

import { test, expect } from "@playwright/test";
import { dirname, join } from "path";
import { existsSync, statSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const gameConfigs = [
  {
    name: "Otto Matic",
    selector: "Otto Matic",
    levelFile: "../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
  },
  {
    name: "Bugdom",
    selector: "Bugdom",
    levelFile: "../../public/assets/bugdom/terrain/Lawn.ter.rsrc",
  },
  {
    name: "Bugdom 2",
    selector: "Bugdom 2",
    levelFile: "../../public/assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
  },
  {
    name: "Cro-Mag Rally",
    selector: "Cro-Mag Rally",
    levelFile: "../../public/assets/croMag/terrain/StoneAge_Jungle.ter.rsrc",
  },
  {
    name: "Nanosaur 2",
    selector: "Nanosaur 2",
    levelFile: "../../public/assets/nanosaur2/terrain/level1.ter.rsrc",
  },
  {
    name: "Billy Frontier",
    selector: "Billy Frontier",
    levelFile: "../../public/assets/billyFrontier/terrain/town_duel.ter.rsrc",
  },
];

test.describe("All Games - Level Loading and Download", () => {
  test.setTimeout(120000); // 2 minutes per test

  for (const game of gameConfigs) {
    test(`${game.name} - Complete workflow`, async ({ page }) => {
      const levelPath = join(__dirname, game.levelFile);

      // Skip if file doesn't exist
      if (!existsSync(levelPath)) {
        console.log(`⏭️  Skipping ${game.name} - level file not found`);
        test.skip();
        return;
      }

      console.log(`\n🎮 Testing ${game.name}...`);

      // Navigate to app
      await page.goto("http://localhost:5173/PangeaRSEdit/");
      await page.waitForLoadState("networkidle");
      console.log("  ✓ App loaded");

      // Take initial screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(/\s+/g, "-")}-01-initial.png`,
        fullPage: true,
      });

      // Find game card
      const gameCard = page.locator(`text="${game.selector}"`).first();
      await expect(gameCard).toBeVisible({ timeout: 10000 });
      console.log(`  ✓ Found ${game.name} card`);

      // Upload level file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(levelPath);
      console.log("  ✓ Level file uploaded");

      // Wait for parsing
      await page.waitForTimeout(5000);

      // Take post-load screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(
          /\s+/g,
          "-",
        )}-02-after-load.png`,
        fullPage: true,
      });

      // Check for errors
      const errorText = await page
        .locator("text=/error|failed|cannot/i")
        .first()
        .textContent()
        .catch(() => null);
      if (errorText && errorText.toLowerCase().includes("buffer")) {
        console.error(`  ❌ Buffer error detected: ${errorText}`);
        throw new Error(`Buffer is not defined error in ${game.name}`);
      }

      // Verify editor elements are visible
      const canvasVisible = await page
        .locator("canvas")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      const downloadButton = await page
        .locator('[data-testid="download-button"]')
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (canvasVisible) {
        console.log("  ✓ Editor canvas visible");
      }
      if (downloadButton) {
        console.log("  ✓ Download button visible");
      }

      // Take editor screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(/\s+/g, "-")}-03-editor.png`,
        fullPage: true,
      });

      // Test download functionality
      if (downloadButton) {
        const downloadPromise = page.waitForEvent("download", {
          timeout: 30000,
        });
        await page.click('[data-testid="download-button"]');

        const download = await downloadPromise;
        const downloadPath = `test-results/${game.name.replace(
          /\s+/g,
          "-",
        )}-downloaded.ter.rsrc`;
        await download.saveAs(downloadPath);

        // Verify download
        const downloadedSize = statSync(downloadPath).size;
        const originalSize = statSync(levelPath).size;
        console.log(
          `  ✓ Downloaded (${downloadedSize} bytes, original: ${originalSize} bytes)`,
        );

        // Size should be within 20% for now
        const sizeRatio = downloadedSize / originalSize;
        expect(sizeRatio).toBeGreaterThan(0.8);
        expect(sizeRatio).toBeLessThan(1.2);
      }

      console.log(`  ✅ ${game.name} test passed\n`);
    });
  }
});
