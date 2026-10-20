import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { runScriptObjectAuthoringRoundTrip } from "./scriptObjectAuthoringRoundTrip";
import { buildScriptWorkspaceFromUI, loadScriptSampleFromUI, openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const levelPath = path.resolve(
  __dirname,
  "../../public/assets/bugdom/terrain/Training.ter.rsrc",
);

function bugdomCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Bugdom", exact: true }),
    })
    .first();
}

test("exports, reopens, and recompiles a Bugdom script package", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bugdom", exact: true })).toBeVisible({ timeout: 30_000 });
  await runScriptPackageRoundTrip(page, bugdomCard(page), [levelPath]);
});

test("creates, places, edits, and reopens a Bugdom scripted object", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bugdom", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptObjectAuthoringRoundTrip(
    page,
    bugdomCard(page),
    [levelPath],
    "Bugdom Test Object",
  );
});

test("uses the production Bugdom Scripts workspace through preview launch", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pangea-feature-flags",
      JSON.stringify({
        scripting: true,
        multiplayer: false,
        itemModelMappingPreview: false,
      }),
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bugdom", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await bugdomCard(page)
    .locator('input[type="file"]')
    .setInputFiles(levelPath);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const dialog = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await buildScriptWorkspaceFromUI(dialog);
  await dialog.getByRole("button", { name: "Test with scripts", exact: true }).click();

  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("heading", { name: /Preview in Bugdom/i }),
  ).toBeVisible({ timeout: 30_000 });
  await previewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("Host Status:", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
  await previewDialog.getByRole("button", { name: "Reload Game", exact: true }).click();
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
});

test("surfaces a production Lua runtime traceback in the Bugdom preview monitor", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pangea-feature-flags",
      JSON.stringify({
        scripting: true,
        multiplayer: false,
        itemModelMappingPreview: false,
      }),
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bugdom", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await bugdomCard(page).locator('input[type="file"]').setInputFiles(levelPath);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const dialog = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await dialog.getByRole("button", { name: "Lua source", exact: true }).click();
  await dialog.getByRole("button", { name: "user.lua", exact: true }).click();

  const editorDialog = dialog;
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'local pangea = require("pangea")\nlocal entry = {}\nfunction entry.onFrame(ctx)\n  error("bugdom production traceback regression")\nend\nreturn entry',
  );
  await editorDialog.getByRole("button", { name: "Save source", exact: true }).click();
  await buildScriptWorkspaceFromUI(dialog);
  await dialog
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
    previewDialog.getByText(/bugdom production traceback regression/, { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
});
