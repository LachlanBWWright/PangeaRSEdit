import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E test for ALL games
 * Verifies that the first level of each game can be loaded into the editor
 * Tests requested by user to ensure rsrcdump-ts v1.0.5 works correctly
 */

const GAMES = [
  {
    name: "Otto Matic",
    cardTitle: "Otto Matic",
    levelFile: "Apocalypse.ter.rsrc",
  },
  {
    name: "Bugdom",
    cardTitle: "Bugdom",
    levelFile: "Lawn.ter.rsrc",
  },
  {
    name: "Bugdom 2",
    cardTitle: "Bugdom 2",
    levelFile: "Level1_Garden.ter.rsrc",
  },
  {
    name: "Cro-Mag Rally",
    cardTitle: "Cro-Mag Rally",
    levelFile: "Jungle.ter.rsrc",
  },
  {
    name: "Nanosaur 2",
    cardTitle: "Nanosaur 2",
    levelFile: "level1.ter.rsrc",
  },
  {
    name: "Billy Frontier",
    cardTitle: "Billy Frontier",
    levelFile: "town_duel.ter.rsrc",
  },
];

test.describe("All Games - First Level Loading", () => {
  for (const game of GAMES) {
    test(`${game.name} - should load first level successfully`, async ({
      page,
    }) => {
      // Navigate to the editor (using correct base path from vite.config.ts)
      await page.goto("/PangeaRSEdit/");

      // Wait for the page to load and find the game card
      const gameCard = page.getByRole("heading", { name: game.cardTitle });
      await expect(gameCard).toBeVisible({ timeout: 10000 });

      // Click the upload button for this game
      const uploadButton = page.getByText(`Upload Level Data (.ter.rsrc)`).first();
      await expect(uploadButton).toBeVisible();

      // Set up file chooser handler
      const fileChooserPromise = page.waitForEvent("filechooser");
      await uploadButton.click();
      const fileChooser = await fileChooserPromise;

      // Upload the level file
      const filePath = `public/assets/${game.name.toLowerCase().replace(/\s+/g, "")}/${game.levelFile}`;
      await fileChooser.setFiles(filePath);

      // Wait for level to load - check for download button (indicates editor view)
      const downloadButton = page.getByRole("button", {
        name: /download.*level/i,
      });
      await expect(downloadButton).toBeVisible({ timeout: 30000 });

      // Verify canvas elements are present (2D tiles, 3D terrain, minimap)
      const canvases = page.locator("canvas");
      await expect(canvases).toHaveCount(3, { timeout: 10000 });

      // Verify no error toasts
      const errorToast = page.getByText(/error/i).first();
      await expect(errorToast).not.toBeVisible();

      // Take a screenshot
      await page.screenshot({
        path: `test-results/${game.name.replace(/\s+/g, "-")}-level-loaded.png`,
        fullPage: true,
      });

      console.log(`✅ ${game.name}: Level loaded successfully`);
    });
  }

  test("All games summary", async () => {
    // This test just provides a summary - the actual work is done above
    console.log("\n=== All Games Level Loading Test Summary ===");
    console.log(`Tested ${GAMES.length} games:`);
    for (const game of GAMES) {
      console.log(`  - ${game.name}: ${game.levelFile}`);
    }
    console.log("============================================\n");
  });
});
