import path from "node:path";
import { expect, test } from "@playwright/test";

const SCREENSHOT_DIRECTORY = path.resolve("screenshots/storybook");

test("captures the multiplayer session sidebar at its narrow desktop width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 420, height: 820 });
  await page.goto(
    "/iframe.html?id=multiplayer-session-sidebar--cro-mag-lobby&viewMode=story",
  );
  await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Lobby ID" })).toHaveCount(0);
  await expect(page.getByText("cromag-rally-lobby-7f3a2b9c", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Debug" })).toHaveCount(0);
  await expect(
    page.locator("div.font-medium").filter({
      hasText: "SamiraWithAQuiteLongDisplayName",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: path.join(
      SCREENSHOT_DIRECTORY,
      "multiplayer-session-sidebar-cromag.png",
    ),
    fullPage: true,
  });
});
