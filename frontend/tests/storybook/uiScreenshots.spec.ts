import { test } from "@playwright/test";
import {
  captureStoryScreenshot,
  type StoryScreenshot,
} from "./captureStoryScreenshot";

const UI_STORIES: readonly StoryScreenshot[] = [
  { id: "pages-custom-levels--default", fileName: "custom-levels.png" },
  { id: "pages-model-viewer--upload-state", fileName: "model-viewer-upload.png" },
  { id: "pages-sprite-editor--empty-workspace", fileName: "sprite-editor-empty.png" },
  { id: "pages-item-model-audit--first-item", fileName: "item-model-audit.png" },
  { id: "pages-test-model-browser--select-model", fileName: "test-model-browser.png" },
  { id: "pages-navigation--default", fileName: "navigation.png" },
  { id: "pages-feature-flags--default", fileName: "feature-flags.png" },
  { id: "scripts-custom-objects-panel--default", fileName: "scripts-custom-objects.png" },
  { id: "multiplayer-lobby-browser--default", fileName: "multiplayer-lobby-browser.png" },
];

test.use({ viewport: { width: 1280, height: 900 } });

for (const story of UI_STORIES) {
  test(`captures ${story.id}`, async ({ page }) => {
    await captureStoryScreenshot(page, story);
  });
}
