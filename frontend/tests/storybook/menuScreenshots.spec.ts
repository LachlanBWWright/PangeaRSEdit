import path from "node:path";
import { expect, test } from "@playwright/test";

const RESPONSIVE_GALLERY_URL =
  "/iframe.html?id=level-editor-menu-layouts--responsive-gallery&viewMode=story";
const SCREENSHOT_DIRECTORY = path.resolve("screenshots/storybook");

const SCREENSHOT_VIEWPORTS = [
  { name: "narrow", width: 375, height: 900 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;
const MENU_COUNT_PER_WIDTH = 8;

for (const viewport of SCREENSHOT_VIEWPORTS) {
  test(`captures the menu gallery at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(RESPONSIVE_GALLERY_URL);
    await expect(
      page.locator("[data-editor-menu-surface] > div"),
    ).toHaveCount(MENU_COUNT_PER_WIDTH);

    await page.screenshot({
      path: path.join(
        SCREENSHOT_DIRECTORY,
        `level-editor-menu-gallery-${viewport.name}.png`,
      ),
      fullPage: true,
    });
  });
}
