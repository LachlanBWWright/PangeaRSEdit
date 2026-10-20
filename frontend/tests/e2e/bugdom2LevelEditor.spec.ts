import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { openScriptWorkspace, loadScriptSampleFromUI, buildScriptWorkspaceFromUI, createScriptObjectFromUI } from "./scriptWorkspaceTestHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const levelPath = path.resolve(
  __dirname,
  "../../public/assets/bugdom2/terrain/Level3_DogHair.ter.rsrc",
);
const texturePath = path.resolve(
  __dirname,
  "../../public/assets/bugdom2/terrain/Level3_DogHair.ter",
);
const tracebackLevelPath = path.resolve(
  __dirname,
  "../../public/assets/bugdom2/terrain/Level1_Garden.ter.rsrc",
);
const tracebackTexturePath = path.resolve(
  __dirname,
  "../../public/assets/bugdom2/terrain/Level1_Garden.ter",
);

function bugdom2Card(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Bugdom 2", exact: true }),
    })
    .first();
}

test("exports, reopens, and recompiles a Bugdom 2 script package", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bugdom 2", exact: true })).toBeVisible({ timeout: 30_000 });
  await runScriptPackageRoundTrip(page, bugdom2Card(page), [levelPath, texturePath]);
});

test("uses the production Bugdom 2 Scripts workspace through preview launch", async ({
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
    page.getByRole("heading", { name: "Bugdom 2", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await bugdom2Card(page)
    .locator('input[type="file"]')
    .setInputFiles([levelPath, texturePath]);
  const levelActions = page.getByRole("button", { name: "Level Actions", exact: true });
  await expect(levelActions).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const dialog = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await buildScriptWorkspaceFromUI(dialog);

  await dialog
    .getByRole("button", { name: "Test with scripts", exact: true })
    .click();
  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("heading", { name: /Preview in Bugdom 2/i }),
  ).toBeVisible({ timeout: 30_000 });
  await previewDialog
    .getByRole("button", { name: "Launch Game", exact: true })
    .click();
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

test("surfaces a production Lua runtime traceback in the Bugdom 2 preview monitor", async ({
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
    page.getByRole("heading", { name: "Bugdom 2", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await bugdom2Card(page)
    .locator('input[type="file"]')
    .setInputFiles([tracebackLevelPath, tracebackTexturePath]);
  await expect(page.getByRole("button", { name: "Level Actions", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(workspace);
  await workspace.getByRole("button", { name: "Lua source", exact: true }).click();
  await workspace.getByRole("button", { name: "user.lua", exact: true }).click();

  const editorDialog = workspace;
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'local pangea = require("pangea")\nlocal entry = {}\nfunction entry.onFrame(ctx)\n  error("bugdom2 production traceback regression")\nend\nreturn entry',
  );
  await editorDialog.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(editorDialog.getByRole("button", { name: "Save source", exact: true })).toBeDisabled();
  await buildScriptWorkspaceFromUI(workspace);
  await workspace.getByRole("button", { name: "Test with scripts", exact: true }).click();
  const previewDialog = page.getByRole("dialog").last();
  await previewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("Last Error:", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    previewDialog.getByText(/bugdom2 production traceback regression/, { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
});

test("creates, places, edits, and reopens a Bugdom 2 scripted object", async ({
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
    page.getByRole("heading", { name: "Bugdom 2", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await bugdom2Card(page)
    .locator('input[type="file"]')
    .setInputFiles([levelPath, texturePath]);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await createScriptObjectFromUI(page, workspace, "Bugdom 2 Test Object");
  await page.getByRole("tab", { name: "Items", exact: true }).click();
  await page.getByText("Select a scripted item", { exact: true }).click();
  await page
    .getByRole("option", { name: "Bugdom 2 Test Object", exact: true })
    .click();
  const editorCanvas = page.locator("canvas").last();
  await expect(editorCanvas).toBeVisible();
  await editorCanvas.click({ position: { x: 600, y: 140 } });
  await editorCanvas.click({ position: { x: 600, y: 140 } });
  await expect(page.locator("#scripted-item-x")).toBeVisible();
  await page.locator("#scripted-item-x").fill("240");
  await expect(page.locator("#scripted-item-x")).toHaveValue("240");

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const reopenedWorkspace = await openScriptWorkspace(page);
  await reopenedWorkspace.getByRole("button", { name: "Objects", exact: true }).click();
  await expect(
    reopenedWorkspace.getByText("Bugdom 2 Test Object", { exact: true }).first(),
  ).toBeVisible();
  await buildScriptWorkspaceFromUI(reopenedWorkspace);
});
