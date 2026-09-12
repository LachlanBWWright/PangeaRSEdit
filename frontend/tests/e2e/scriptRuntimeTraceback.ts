import { expect, type Locator, type Page } from "@playwright/test";
import { openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

export async function runScriptRuntimeTraceback(
  page: Page,
  card: Locator,
  levelFiles: readonly string[],
  errorMessage: string,
  hookName = "onFrame",
): Promise<void> {
  await card.locator('input[type="file"]').setInputFiles([...levelFiles]);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await workspace.getByRole("tab", { name: "Overview", exact: true }).click();
  await workspace.getByRole("button", { name: "Load", exact: true }).first().click();
  await workspace.getByRole("tab", { name: "Code", exact: true }).click();
  await workspace.getByRole("button", { name: /user\.lua Saved/ }).click();

  const editorDialog = page.getByRole("dialog").last();
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    `local pangea = require("pangea")\nlocal entry = {}\nfunction entry.${hookName}(ctx)\n  error("${errorMessage}")\nend\nreturn entry`,
  );
  await editorDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved source file", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await workspace
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await workspace.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await workspace
    .getByRole("button", { name: "Preview with Scripts", exact: true })
    .click();
  const previewDialog = page.getByRole("dialog").last();
  await previewDialog
    .getByRole("button", { name: "Launch Game", exact: true })
    .click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("Last Error:", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    previewDialog.getByText(errorMessage, { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
}
