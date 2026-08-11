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

test("interactive stories complete their expected state transitions", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-form-controls--all-controls&viewMode=story");
  await expect(page.getByLabel("Level name")).toHaveValue("Test level");
  await expect(page.getByRole("combobox", { name: "Editor layer" })).toHaveText("Water");

  await page.goto("/iframe.html?id=ui-overlays--popover-interaction&viewMode=story");
  await expect(page.getByText("Duplicate or export this level.")).toBeVisible();

  await page.goto("/iframe.html?id=ui-navigation-and-cards--tab-interaction&viewMode=story");
  await expect(page.getByRole("tab", { name: "Terrain" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/iframe.html?id=ui-layout--carousel-and-resizable-panels&viewMode=story");
  await expect(page.getByRole("button", { name: "Previous slide" })).toBeEnabled();
});
