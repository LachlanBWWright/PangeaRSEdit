import { expect, type Locator, type Page } from "@playwright/test";

export async function openScriptWorkspace(page: Page): Promise<Locator> {
  const openScripts = page.getByRole("button", {
    name: "Open Scripts",
    exact: true,
  });
  if ((await openScripts.count()) > 0 && (await openScripts.first().isVisible())) {
    await openScripts.first().click();
  }

  const dialogs = page.getByRole("dialog");
  const workspace =
    (await dialogs.count()) > 0 && (await dialogs.last().isVisible())
      ? dialogs.last()
      : page.locator("body");
  await expect(
    workspace.getByRole("button", { name: "Level events", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  return workspace;
}

export async function loadScriptSampleFromUI(workspace: Locator, sample = "log-level-start"): Promise<void> {
  await workspace.getByRole("button", { name: "Level events", exact: true }).click();
  await workspace.getByText("Explore a sample workspace", { exact: true }).click();
  await workspace.getByRole("combobox", { name: "Sample workspace", exact: true }).selectOption(sample);
  await workspace.getByRole("button", { name: "Replace workspace with sample", exact: true }).click();
}

export async function buildScriptWorkspaceFromUI(workspace: Locator): Promise<void> {
  await workspace.getByRole("button", { name: "Test & export", exact: true }).click();
  await workspace.getByRole("button", { name: "Rebuild bundle", exact: true }).click();
  await expect(workspace.getByText("Lua 5.4 syntax, modules and behavior exports validated; test in game to verify behavior").first()).toBeVisible({ timeout: 30_000 });
}

export async function createScriptObjectFromUI(page: Page, workspace: Locator, name: string): Promise<void> {
  await workspace.getByRole("button", { name: "Objects", exact: true }).click();
  await workspace.getByRole("button", { name: "New object", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Object name", { exact: true }).fill(name);
  await page.getByRole("dialog").getByRole("button", { name: "Create object", exact: true }).click();
  await expect(workspace.getByLabel("Object name", { exact: true })).toHaveValue(name);
}
