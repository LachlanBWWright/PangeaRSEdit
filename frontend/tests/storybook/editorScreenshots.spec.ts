import { test } from "@playwright/test";
import {
  captureStoryScreenshot,
  type StoryScreenshot,
} from "./captureStoryScreenshot";

const EDITOR_STORIES: readonly StoryScreenshot[] = [
  {
    id: "level-editor-common-controls--canvas-history-and-zoom",
    fileName: "level-editor-controls-history-and-zoom.png",
  },
  {
    id: "level-editor-common-controls--canvas-history-boundaries",
    fileName: "level-editor-controls-history-boundaries.png",
  },
  {
    id: "level-editor-common-controls--empty-level-data",
    fileName: "level-editor-controls-empty-level-data.png",
  },
  {
    id: "level-editor-menu-layouts--standard-width",
    fileName: "level-editor-menu-standard-width.png",
  },
];

test.use({ viewport: { width: 1440, height: 1000 } });

for (const story of EDITOR_STORIES) {
  test(`captures ${story.id}`, async ({ page }) => {
    await captureStoryScreenshot(page, story);
  });
}
