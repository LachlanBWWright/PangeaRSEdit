import { test, expect } from "@playwright/test";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import type { Page } from "@playwright/test";

// Helper to wait for level to fully load
async function waitForLevelLoad(page: Page) {
  // Wait for editor view to be visible
  await expect(page.getByText("Download Level Data")).toBeVisible({
    timeout: 30000,
  });

  // Wait for canvases to render
  await page.waitForSelector("canvas", { timeout: 30000 });

  // Wait a bit for Three.js to fully render
  await page.waitForTimeout(2000);
}

test.describe("Complete Editor Flow - All Games", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for home page to load
    await expect(page.getByText("Pangea Level Editor")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Otto Matic - Load and Download Level", async ({ page }) => {
    // Upload level file
    const filePath = path.join(
      __dirname,
      "../../src/assets/EarthFarm.ter.rsrc",
    );
    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Upload Level Data (.ter.rsrc)").first().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    // Wait for level to load completely
    await waitForLevelLoad(page);

    // Verify editor view is showing (should have download button)
    await expect(page.getByText("Download Level Data")).toBeVisible();

    // Verify canvases rendered (3 canvases: tile view, 3D terrain, minimap)
    const canvases = await page.locator("canvas").count();
    expect(canvases).toBeGreaterThanOrEqual(2); // At least 2 canvases should be visible

    // Take screenshot of editor
    await page.screenshot({
      path: "test-results/otto-matic-editor.png",
      fullPage: true,
    });

    // Download level
    const downloadPromise = page.waitForEvent("download");
    await page.getByText("Download Level Data").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".ter.rsrc");

    // Verify downloaded file is not empty
    const downloadPath = await download.path();
    const fs = await import("fs/promises");
    const stats = await fs.stat(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be at least 1KB
  });

  test("Bugdom - Load and Download Level", async ({ page }) => {
    // Navigate to Bugdom section (might need to scroll carousel)
    const bugdomCard = page.getByText("Bugdom Levels");
    if (await bugdomCard.isVisible()) {
      // Upload level file
      const filePath = path.join(
        __dirname,
        "../../src/assets/Bugdom1-Level1.ter.rsrc",
      );
      const fileChooserPromise = page.waitForEvent("filechooser");
      await page.locator("text=Upload Level Data (.ter.rsrc)").nth(1).click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Wait for level to load
      await waitForLevelLoad(page);

      // Verify editor view
      await expect(page.getByText("Download Level Data")).toBeVisible();

      const canvases = await page.locator("canvas").count();
      expect(canvases).toBeGreaterThanOrEqual(2);

      await page.screenshot({
        path: "test-results/bugdom-editor.png",
        fullPage: true,
      });

      // Download level
      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Download Level Data").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".ter.rsrc");

      const downloadPath = await download.path();
      const fs = await import("fs/promises");
      const stats = await fs.stat(downloadPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  test("Bugdom 2 - Load and Download Level", async ({ page }) => {
    // Navigate to Bugdom 2 (scroll right in carousel if needed)
    await page.locator('button[aria-label="Next slide"]').click();
    await page.waitForTimeout(500);

    const bugdom2Card = page.getByText("Bugdom 2 Levels");
    if (await bugdom2Card.isVisible()) {
      // Upload level file
      const filePath = path.join(
        __dirname,
        "../../src/assets/Bugdom2-Level1.ter.rsrc",
      );
      const fileChooserPromise = page.waitForEvent("filechooser");

      // Find the Bugdom 2 upload button
      const uploadButtons = await page
        .locator("text=Upload Level Data (.ter.rsrc)")
        .all();
      for (const btn of uploadButtons) {
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Wait for level to load
      await waitForLevelLoad(page);

      // Verify editor view
      await expect(page.getByText("Download Level Data")).toBeVisible();

      const canvases = await page.locator("canvas").count();
      expect(canvases).toBeGreaterThanOrEqual(2);

      await page.screenshot({
        path: "test-results/bugdom2-editor.png",
        fullPage: true,
      });

      // Download level
      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Download Level Data").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".ter.rsrc");

      const downloadPath = await download.path();
      const fs = await import("fs/promises");
      const stats = await fs.stat(downloadPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  test("Cro-Mag Rally - Load and Download Level", async ({ page }) => {
    // Scroll to find Cro-Mag Rally
    for (let i = 0; i < 3; i++) {
      await page.locator('button[aria-label="Next slide"]').click();
      await page.waitForTimeout(500);
    }

    const croMagCard = page.getByText("Cro-Mag Rally Levels");
    if (await croMagCard.isVisible()) {
      // Upload level file
      const filePath = path.join(
        __dirname,
        "../../src/assets/CroMagRally-Level1.ter.rsrc",
      );
      const fileChooserPromise = page.waitForEvent("filechooser");

      const uploadButtons = await page
        .locator("text=Upload Level Data (.ter.rsrc)")
        .all();
      for (const btn of uploadButtons) {
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Wait for level to load
      await waitForLevelLoad(page);

      // Verify editor view
      await expect(page.getByText("Download Level Data")).toBeVisible();

      const canvases = await page.locator("canvas").count();
      expect(canvases).toBeGreaterThanOrEqual(2);

      await page.screenshot({
        path: "test-results/cromag-rally-editor.png",
        fullPage: true,
      });

      // Download level
      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Download Level Data").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".ter.rsrc");

      const downloadPath = await download.path();
      const fs = await import("fs/promises");
      const stats = await fs.stat(downloadPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  test("Nanosaur 2 - Load and Download Level", async ({ page }) => {
    // Scroll to find Nanosaur 2
    for (let i = 0; i < 4; i++) {
      await page.locator('button[aria-label="Next slide"]').click();
      await page.waitForTimeout(500);
    }

    const nanosaur2Card = page.getByText("Nanosaur 2 Levels");
    if (await nanosaur2Card.isVisible()) {
      // Upload level file
      const filePath = path.join(
        __dirname,
        "../../src/assets/Nanosaur2-Level1.ter.rsrc",
      );
      const fileChooserPromise = page.waitForEvent("filechooser");

      const uploadButtons = await page
        .locator("text=Upload Level Data (.ter.rsrc)")
        .all();
      for (const btn of uploadButtons) {
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Wait for level to load
      await waitForLevelLoad(page);

      // Verify editor view
      await expect(page.getByText("Download Level Data")).toBeVisible();

      const canvases = await page.locator("canvas").count();
      expect(canvases).toBeGreaterThanOrEqual(2);

      await page.screenshot({
        path: "test-results/nanosaur2-editor.png",
        fullPage: true,
      });

      // Download level
      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Download Level Data").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".ter.rsrc");

      const downloadPath = await download.path();
      const fs = await import("fs/promises");
      const stats = await fs.stat(downloadPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  test("Billy Frontier - Load and Download Level", async ({ page }) => {
    // Scroll to find Billy Frontier
    for (let i = 0; i < 5; i++) {
      await page.locator('button[aria-label="Next slide"]').click();
      await page.waitForTimeout(500);
    }

    const billyCard = page.getByText("Billy Frontier Levels");
    if (await billyCard.isVisible()) {
      // Upload level file
      const filePath = path.join(
        __dirname,
        "../../src/assets/BillyFrontier-Level1.ter.rsrc",
      );
      const fileChooserPromise = page.waitForEvent("filechooser");

      const uploadButtons = await page
        .locator("text=Upload Level Data (.ter.rsrc)")
        .all();
      for (const btn of uploadButtons) {
        if (await btn.isVisible()) {
          await btn.click();
          break;
        }
      }

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(filePath);

      // Wait for level to load
      await waitForLevelLoad(page);

      // Verify editor view
      await expect(page.getByText("Download Level Data")).toBeVisible();

      const canvases = await page.locator("canvas").count();
      expect(canvases).toBeGreaterThanOrEqual(2);

      await page.screenshot({
        path: "test-results/billy-frontier-editor.png",
        fullPage: true,
      });

      // Download level
      const downloadPromise = page.waitForEvent("download");
      await page.getByText("Download Level Data").click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain(".ter.rsrc");

      const downloadPath = await download.path();
      const fs = await import("fs/promises");
      const stats = await fs.stat(downloadPath);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });
});
