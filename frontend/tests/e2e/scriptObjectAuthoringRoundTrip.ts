import { expect, type Locator, type Page } from "@playwright/test";
import { buildScriptWorkspaceFromUI, createScriptObjectFromUI, openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

export async function runScriptObjectAuthoringRoundTrip(
  page: Page,
  card: Locator,
  levelFiles: readonly string[],
  objectLabel: string,
): Promise<void> {
  await card.locator('input[type="file"]').setInputFiles([...levelFiles]);
  const levelActions = page
    .locator("summary")
    .filter({ hasText: "Level Actions" })
    .or(page.getByRole("button", { name: "Level Actions", exact: true }));
  await expect(levelActions).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await createScriptObjectFromUI(page, workspace, objectLabel);
  await expect(workspace.getByRole("combobox", { name: "Appearance", exact: true })).toHaveText("Invisible / logic only");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Items", exact: true }).click();
  await page.getByText("Select a scripted item", { exact: true }).click();
  await page.getByRole("option", { name: objectLabel, exact: true }).click();

  const editorCanvas = page.locator("canvas").last();
  await expect(editorCanvas).toBeVisible();
  const canvasBox = await editorCanvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) {
    return;
  }
  const canvasPosition = {
    x: Math.max(1, Math.floor(canvasBox.width / 2)),
    y: Math.max(1, Math.floor(canvasBox.height / 2)),
  };
  await editorCanvas.click({ position: canvasPosition });
  await editorCanvas.click({ position: canvasPosition });
  await expect(page.locator("#scripted-item-x")).toBeVisible();
  await page.locator("#scripted-item-x").fill("240");
  await expect(page.locator("#scripted-item-x")).toHaveValue("240");

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const reopenedWorkspace = await openScriptWorkspace(page);
  await reopenedWorkspace
    .getByRole("button", { name: "Objects", exact: true })
    .click();
  await expect(reopenedWorkspace.getByText(objectLabel, { exact: true }).first()).toBeVisible();
  await buildScriptWorkspaceFromUI(reopenedWorkspace);
}
