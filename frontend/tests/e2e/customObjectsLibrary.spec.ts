import { expect, test } from "@playwright/test";

const scriptingFlags = JSON.stringify({
  scripting: true,
  multiplayer: false,
  itemModelMappingPreview: false,
  scriptItemDemoLevels: false,
});

test.describe("game custom-object library", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((flags) => {
      window.localStorage.setItem("pangea-feature-flags", flags);
    }, scriptingFlags);
    await page.goto("#/custom-objects");
  });

  test("exposes a compact game library without level navigation or placement controls", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "Game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Custom Object Script" })).toBeVisible();
    await expect(page.getByText("Game-wide definitions · instances are placed per level")).toBeVisible();
    await expect(page.getByText("Instances on this level")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Levels", exact: true })).toHaveCount(0);
  });

  test("switches the definition library to another game", async ({ page }) => {
    await page.getByRole("combobox", { name: "Game" }).click();
    await page.getByRole("option", { name: "Bugdom 2" }).click();
    await expect(page.getByRole("combobox", { name: "Game" })).toHaveText("Bugdom 2");
  });

  test("opens the custom-object script creation flow", async ({ page }) => {
    await page.getByRole("button", { name: "Create Custom Object Script" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Create Script" })).toBeVisible();
    await expect(page.locator("#target")).toHaveText("Custom Object");
  });
});
