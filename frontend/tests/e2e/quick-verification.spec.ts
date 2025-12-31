/**
 * Fast verification test - just load one level per game and take screenshots
 */

import { test, expect } from "@playwright/test";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const games = [
  {
    name: "Otto Matic",
    file: "../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
  },
  { name: "Bugdom", file: "../../public/assets/bugdom/terrain/Lawn.ter.rsrc" },
  {
    name: "Bugdom 2",
    file: "../../public/assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
  },
  {
    name: "Cro-Mag Rally",
    file: "../../public/assets/croMag/terrain/StoneAge_Jungle.ter.rsrc",
  },
];

test.describe("Quick Game Verification", () => {
  test.setTimeout(60000);

  for (const game of games) {
    test(`${game.name} loads successfully`, async ({ page }) => {
      const levelPath = join(__dirname, game.file);
      if (!existsSync(levelPath)) {
        console.log(`Skip ${game.name} - no file`);
        test.skip();
        return;
      }

      console.log(`Testing ${game.name}...`);

      await page.goto("http://localhost:5173/PangeaRSEdit/");
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });

      // Take initial screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(/\s+/g, "-")}-initial.png`,
        fullPage: true,
      });
      console.log(`  ✓ Initial screenshot taken`);

      // Find and upload file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(levelPath);
      console.log(`  ✓ File uploaded`);

      // Wait a bit for processing
      await page.waitForTimeout(4000);

      // Take post-load screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(/\s+/g, "-")}-loaded.png`,
        fullPage: true,
      });
      console.log(`  ✓ Post-load screenshot taken`);

      // Check for Buffer error
      const bodyText = await page.textContent("body").catch(() => "");
      if (bodyText.includes("Buffer is not defined")) {
        throw new Error("Buffer is not defined error detected!");
      }

      // Check if canvas or editor visible
      const canvasCount = await page.locator("canvas").count();
      console.log(`  ✓ Found ${canvasCount} canvas elements`);

      expect(canvasCount).toBeGreaterThan(0);
      console.log(`✅ ${game.name} test passed\n`);
    });
  }
});
