import path from "node:path";
import { expect, type Page } from "@playwright/test";

const SCREENSHOT_DIRECTORY = path.resolve("screenshots/storybook");

export type StoryScreenshot = Readonly<{
  id: string;
  fileName: string;
}>;

export async function captureStoryScreenshot(
  page: Page,
  story: StoryScreenshot,
): Promise<void> {
  await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
  await expect(page.locator("#storybook-root > *").first()).toBeAttached();
  await expect(page.locator(".sb-errordisplay")).toBeHidden();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIRECTORY, story.fileName),
    fullPage: true,
    animations: "disabled",
  });
}
