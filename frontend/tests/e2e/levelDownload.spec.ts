import { test, expect } from "@playwright/test";

test.describe("Level Download", () => {
  test("should download a Bugdom level when clicking a level button and then download", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and click the Bugdom "Level 1" button (Training.ter)
    const bugdomLevel1 = page.getByRole("button", { name: "Level 1" }).first();
    await bugdomLevel1.click();

    // Wait for editor to load by checking for the download button to appear
    const downloadButton = page
      .getByRole("button", { name: /download|save/i })
      .first();
    await downloadButton.waitFor({ state: "visible", timeout: 15000 });

    // Set up download listener before clicking
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
    await page.waitForLoadState("networkidle");

    // Navigate to Nanosaur section and click Default level
    const nanosaurDefault = page
      .getByRole("button", { name: "Default" })
      .first();

    // If not visible, scroll the carousel to find it
    if (!(await nanosaurDefault.isVisible())) {
      const nextButton = page.getByRole("button", { name: /next/i }).first();
      for (let i = 0; i < 5; i++) {
        if (await nanosaurDefault.isVisible()) break;
        await nextButton.click();
        await nextButton.waitFor({ state: "visible" });
      }
    }

    await nanosaurDefault.click();

    // Wait for editor to load by checking for the download button
    const downloadButton = page
      .getByRole("button", { name: /download|save/i })
      .first();
    await downloadButton.waitFor({ state: "visible", timeout: 15000 });

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await downloadButton.click();

    // Verify download was triggered
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });
});
