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

  test("exposes a game object library with a clear first action", async ({ page }) => {
    await expect(page.getByRole("combobox", { name: "Game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create your first object" })).toBeVisible();
    await expect(page.getByText("Build an object once. Use it throughout your game.")).toBeVisible();
    await expect(page.getByText("Instances on this level")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Levels", exact: true })).toHaveCount(0);
  });

  test("switches the definition library to another game", async ({ page }) => {
    await page.getByRole("combobox", { name: "Game" }).click();
    await page.getByRole("option", { name: "Bugdom 2" }).click();
    await expect(page.getByRole("combobox", { name: "Game" })).toHaveText("Bugdom 2");
  });

  test("creates a definition and its editable behavior together", async ({ page }) => {
    await page.getByRole("button", { name: "New object", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Object name", { exact: true }).fill("Checkpoint lantern");
    await page.getByRole("button", { name: "Create object", exact: true }).click();
    await expect(page.getByLabel("Object name", { exact: true })).toHaveValue("Checkpoint lantern");
    await page.getByRole("button", { name: "Edit behavior" }).click();
    await expect(page.locator(".monaco-editor")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Lua intelligence");
  });
});
