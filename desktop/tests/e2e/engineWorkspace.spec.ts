import { test, expect } from "./desktopFixture.ts";

test("Lua engine preview runs under the Electron protocol and guards package edits", async ({ desktop }) => {
  test.skip(process.env.PANGEA_SANDBOX_RUNTIME_TEST !== "1", "Stage the engine runtime and rebuild the desktop renderer first.");
  const { page, application } = desktop;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Lua Engine level editor/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Lua Engine", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Package source", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Edit levels", exact: true }).click();
  await page.getByLabel("Sample height", { exact: true }).fill("17");
  await page.getByRole("link", { name: "Package & scripts", exact: true }).click();
  const preview = page.frameLocator('iframe[title="Lua engine preview"]');
  await expect(preview.getByRole("heading", { name: "Engine foundation", exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/scene ·/)).toBeVisible();
  await preview.locator("canvas").focus(); await page.keyboard.press("Escape");
  await expect(preview.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "scenes/scene.json", exact: true }).click();
  await page.getByText("Scene properties", { exact: true }).click();
  await page.getByLabel("Cells per chunk", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Run changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preview updated.");
  await expect(page.getByText(/scene ·/)).toBeVisible();
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => { console.log("engine-close-confirmation"); return { response: 0, checkboxChecked: false }; };
    dialog.showMessageBoxSync = () => { console.log("engine-close-confirmation"); return 0; };
  });
  const shown = application.waitForEvent("console", { predicate: (message) => message.text() === "engine-close-confirmation", timeout: 5000 });
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await shown;
  await expect(page.getByRole("heading", { name: "Pangea Engine *", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("existing level terrain previews inside Electron while the level stays open", async ({ desktop }) => {
  test.skip(process.env.PANGEA_SANDBOX_RUNTIME_TEST !== "1", "Stage the engine runtime and rebuild the desktop renderer first.");
  const { page } = desktop;
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Lua Engine level editor/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Create Blank Level", exact: true }).first().click();
  await page.getByRole("button", { name: "Level Actions", exact: true }).click();
  await page.getByRole("menuitem", { name: "Preview terrain in Lua Engine", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Your original level stays open.", { timeout: 30_000 });
  const preview = page.frameLocator('iframe[title="Lua engine terrain preview"]');
  await expect(preview.getByRole("heading", { name: "Terrain test", exact: true })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Level Actions", exact: true })).toBeVisible();
});
