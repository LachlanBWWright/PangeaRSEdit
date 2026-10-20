import { expect, type Locator, type Page } from "@playwright/test";
import { buildScriptWorkspaceFromUI, loadScriptSampleFromUI, openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

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
  await loadScriptSampleFromUI(workspace);
  await workspace.getByRole("button", { name: "Lua source", exact: true }).click();
  await workspace.getByRole("button", { name: "user.lua", exact: true }).click();

  const editorDialog = workspace;
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    `local pangea = require("pangea")\nlocal entry = {}\nfunction entry.${hookName}(ctx)\n  error("${errorMessage}")\nend\nreturn entry`,
  );
  await editorDialog.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(editorDialog.getByRole("button", { name: "Save source", exact: true })).toBeDisabled();
  await buildScriptWorkspaceFromUI(workspace);
  await workspace
    .getByRole("button", { name: "Test with scripts", exact: true })
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
