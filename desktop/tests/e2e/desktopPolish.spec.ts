import * as fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "./desktopFixture.ts";

test("Save and close writes a dirty level before closing the window", async ({ desktop }) => {
  const { application, page, folder } = desktop;
  page.on("dialog", () => {});
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
  }, folder);
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /New Project/ }).click();
  await page.getByRole("button", { name: "Choose folder and create" }).click();
  await page.getByRole("button", { name: "Create Blank Level", exact: true }).first().click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).toBeVisible();
  const workspace = page.getByRole("navigation", { name: "Project workspace" });
  await expect(workspace.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  await application.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 2, checkboxChecked: false });
  });
  const closed = page.waitForEvent("close");
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.close());
  await closed;
  expect(await fs.readFile(path.join(folder, "pangea.project.json"), "utf8")).toContain(".pangea/levels/");
});

test("window dimensions persist across restart", async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  await desktop.application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window?.setPosition(0, 0);
    window?.setSize(1100, 750);
  });
  await expect.poll(() => fs.readFile(path.join(profile, "window-state.json"), "utf8")
    .then((text) => text.includes('"width":1100'), () => false)).toBe(true);
  const saved = await fs.readFile(path.join(profile, "window-state.json"), "utf8");
  const resumed = await desktop.restart();
  expect(resumed).not.toBeNull();
  if (!resumed) return;
  const displays = await resumed.application.evaluate(({ screen }) => screen.getAllDisplays().map((display) => display.workArea));
  expect(await resumed.application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getSize()), JSON.stringify({ saved, displays })).toEqual([1100, 750]);
});

test("opening a project can cancel or save the current dirty document", async ({ desktop }) => {
  const { application, page, folder } = desktop;
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
  }, folder);
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /New Project/ }).click();
  await page.getByRole("button", { name: "Choose folder and create" }).click();
  await page.getByRole("button", { name: "Create Blank Level", exact: true }).first().click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Open Project/ }).click();
  const transition = page.getByRole("dialog", { name: "Save edits before continuing?" });
  await expect(transition).toBeVisible();
  await transition.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Open Project/ }).click();
  await transition.getByRole("button", { name: "Save and continue" }).click();
  await expect(transition).not.toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Project level opened", { exact: true })).toBeVisible();
  expect(await fs.readFile(path.join(folder, "pangea.project.json"), "utf8")).toContain(".pangea/levels/");
});
