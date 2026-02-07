import { test, expect } from "@playwright/test";

test.describe("Level Download", () => {
  test("should download a Bugdom level when clicking a level button and then download", async ({
    page,
  }) => {
    await page.goto("/");

    // Find and click the Bugdom "Level 1" button (Training.ter)
    const bugdomLevel1 = page.getByRole("button", { name: "Level 1" }).first();
    await bugdomLevel1.click();

    // Wait for editor to load
    await page.waitForTimeout(3000);

    // Look for the download/save button
    const downloadButton = page
      .getByRole("button", { name: /download|save/i })
      .first();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });

    await downloadButton.click();

    // Verify download was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test("should download a Nanosaur level when clicking a level button and then download", async ({
    page,
  }) => {
    await page.goto("/");

    // Navigate to Nanosaur section and click Default level
    // The carousel may need scrolling to reach Nanosaur
    const nanosaurDefault = page
      .getByRole("button", { name: "Default" })
      .first();

    // If not visible, try scrolling
    if (!(await nanosaurDefault.isVisible())) {
      // Scroll the carousel
      const nextButton = page.getByRole("button", { name: /next/i }).first();
      for (let i = 0; i < 5; i++) {
        if (await nanosaurDefault.isVisible()) break;
        await nextButton.click();
        await page.waitForTimeout(500);
      }
    }

    await nanosaurDefault.click();

    // Wait for editor to load
    await page.waitForTimeout(3000);

    // Look for the download/save button
    const downloadButton = page
      .getByRole("button", { name: /download|save/i })
      .first();

    // Set up download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });

    await downloadButton.click();

    // Verify download was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });
});
