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
    workspace.getByRole("tab", { name: "Overview", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  return workspace;
}
