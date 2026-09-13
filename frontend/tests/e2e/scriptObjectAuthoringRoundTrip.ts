import { expect, type Locator, type Page } from "@playwright/test";
import { openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

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
  await workspace.getByRole("tab", { name: "Assignments", exact: true }).click();
  await workspace.locator("#custom-object-label").fill(objectLabel);
  await workspace.getByRole("button", { name: "Save Object", exact: true }).click();
  await expect(workspace.getByText(objectLabel, { exact: true })).toBeVisible();

  await workspace
    .getByRole("combobox", { name: `${objectLabel} visual type` })
    .click();
  await page.getByRole("option", { name: "No visual", exact: true }).click();
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
    .getByRole("tab", { name: "Assignments", exact: true })
    .click();
  await expect(reopenedWorkspace.getByText(objectLabel, { exact: true }).first()).toBeVisible();
  await reopenedWorkspace
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await reopenedWorkspace
    .getByRole("button", { name: "Compile Bundle", exact: true })
    .click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}
