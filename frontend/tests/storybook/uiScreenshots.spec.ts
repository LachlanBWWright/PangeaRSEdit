import { test } from "@playwright/test";
import {
  captureStoryScreenshot,
  type StoryScreenshot,
} from "./captureStoryScreenshot";

const UI_STORIES: readonly StoryScreenshot[] = [
  { id: "ui-button--default", fileName: "ui-button-default.png" },
  { id: "ui-button--destructive", fileName: "ui-button-destructive.png" },
  { id: "ui-button--disabled", fileName: "ui-button-disabled.png" },
  { id: "ui-feedback--states", fileName: "ui-feedback-states.png" },
  { id: "ui-form-controls--all-controls", fileName: "ui-form-controls-all.png" },
  { id: "ui-form-controls--input-events", fileName: "ui-form-controls-input.png" },
  {
    id: "ui-form-controls--slider-keyboard-interaction",
    fileName: "ui-form-controls-slider.png",
  },
  {
    id: "ui-layout--carousel-and-resizable-panels",
    fileName: "ui-layout-carousel-and-panels.png",
  },
  {
    id: "ui-navigation-and-cards--tab-interaction",
    fileName: "ui-navigation-and-cards.png",
  },
  {
    id: "ui-overlays--dialog-interaction",
    fileName: "ui-overlays-dialog.png",
  },
  {
    id: "ui-overlays--popover-interaction",
    fileName: "ui-overlays-popover.png",
  },
  {
    id: "ui-overlays--tooltip-interaction",
    fileName: "ui-overlays-tooltip.png",
  },
  {
    id: "ui-toast--notification-interaction",
    fileName: "ui-toast-notification.png",
  },
];

test.use({ viewport: { width: 1280, height: 900 } });

for (const story of UI_STORIES) {
  test(`captures ${story.id}`, async ({ page }) => {
    await captureStoryScreenshot(page, story);
  });
}
