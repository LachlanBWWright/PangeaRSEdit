import { test, expect } from "./desktopFixture.ts";

test("automatic recovery survives an application restart and restores unsaved level settings", async ({ desktop }) => {
  const { application, folder } = desktop;
  let page = desktop.page;
  await application.evaluate(({ dialog }, selectedFolder) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selectedFolder] });
  }, folder);
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /New Project/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("Recovery project");
  await page.getByRole("button", { name: "Choose folder and create" }).click();
  await page.getByRole("button", { name: "Create Blank Level", exact: true }).first().click();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Save All/ }).click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).not.toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Project Settings/ }).click();
  await page.getByRole("combobox", { name: "Native base level" }).selectOption("2");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const reply = await window.pangeaDesktop?.request({ operation: "project.inspect" });
    return reply;
  }), { timeout: 30_000 }).toMatchObject({ ok: true, value: { recoveryAvailable: true } });
  const resumed = await desktop.restart();
  expect(resumed).not.toBeNull();
  if (!resumed) return;
  page = resumed.page;
  await expect(page.getByText("Project level opened", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Level Actions", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Recover Unsaved Work/ }).click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(page.getByText("Unsaved level recovered", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("Unsaved changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Project Settings/ }).click();
  await expect(page.getByRole("combobox", { name: "Native base level" })).toHaveValue("2");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Save All/ }).click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).not.toBeVisible({ timeout: 30_000 });
  const inspected = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "project.inspect" }));
  expect(inspected).toMatchObject({ ok: true, value: { recoveryAvailable: false, manifest: { levels: [expect.objectContaining({ baseLevel: 2 })] } } });
});
