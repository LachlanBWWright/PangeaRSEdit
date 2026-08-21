import { expect, test } from "@playwright/test";
import { z } from "zod";

const storyIndexSchema = z.object({
  entries: z.record(
    z.string(),
    z.object({
      id: z.string(),
      type: z.string(),
    }),
  ),
});

test("every Storybook story renders without runtime errors", async ({ page, request }) => {
  const response = await request.get("/index.json");
  await expect(response).toBeOK();
  const payload: unknown = await response.json();
  const parsedIndex = storyIndexSchema.safeParse(payload);
  expect(parsedIndex.success).toBe(true);
  if (!parsedIndex.success) return;

  const storyIds = Object.values(parsedIndex.data.entries)
    .filter((entry) => entry.type === "story")
    .map((entry) => entry.id);
  expect(storyIds.length).toBeGreaterThan(0);

  const runtimeErrors: string[] = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  for (const storyId of storyIds) {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    await expect(page.locator("#storybook-root > *").first(), storyId).toBeAttached();
    await expect(page.locator(".sb-errordisplay"), storyId).toBeHidden();
  }

  expect(runtimeErrors).toEqual([]);
});

test("production stories complete their expected state transitions", async ({ page }) => {
  await page.goto("/iframe.html?id=level-editor-common-controls--canvas-history-and-zoom&viewMode=story");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  await page.getByRole("button", { name: "Zoom in" }).click();

  await page.goto("/iframe.html?id=multiplayer-lobby-browser--default&viewMode=story");
  await page.getByRole("combobox", { name: "Game" }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
});
