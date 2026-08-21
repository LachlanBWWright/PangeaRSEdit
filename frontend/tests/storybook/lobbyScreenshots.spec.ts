import { test } from "@playwright/test";
import { captureStoryScreenshot } from "./captureStoryScreenshot";

test("captures multiplayer lobby browser at desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await captureStoryScreenshot(page, {
    id: "multiplayer-lobby-browser--default",
    fileName: "multiplayer-lobby-browser-desktop.png",
  });
});

test("captures multiplayer lobby browser at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await captureStoryScreenshot(page, {
    id: "multiplayer-lobby-browser--narrow-layout",
    fileName: "multiplayer-lobby-browser-narrow.png",
  });
});
