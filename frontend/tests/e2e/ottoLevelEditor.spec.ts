import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { openScriptWorkspace, loadScriptSampleFromUI, buildScriptWorkspaceFromUI, createScriptObjectFromUI } from "./scriptWorkspaceTestHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const earthFarmLevelPath = path.resolve(
  __dirname,
  "../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
);
const earthFarmTexturePath = path.resolve(
  __dirname,
  "../../public/assets/ottoMatic/terrain/EarthFarm.ter",
);

function ottoCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Otto Matic", exact: true }),
    })
    .first();
}

test("exports, reopens, and recompiles an Otto Matic script package", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Otto Matic", exact: true })).toBeVisible({ timeout: 30_000 });
  await runScriptPackageRoundTrip(page, ottoCard(page), [earthFarmLevelPath, earthFarmTexturePath]);
});

test("uses the production Otto Scripts workspace through preview launch", async ({
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
    page.getByRole("heading", { name: "Otto Matic", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await ottoCard(page)
    .locator('input[type="file"]')
    .setInputFiles([earthFarmLevelPath, earthFarmTexturePath]);
  const levelActions = page
    .locator("summary")
    .filter({ hasText: "Level Actions" })
    .or(page.getByRole("button", { name: "Level Actions", exact: true }));
  await expect(levelActions).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(workspace);
  await buildScriptWorkspaceFromUI(workspace);

  await workspace
    .getByRole("button", { name: "Test with scripts", exact: true })
    .click();
  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("heading", { name: /Preview in Otto Matic/i }),
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
  await previewDialog
    .getByRole("button", { name: "Reload Game", exact: true })
    .click({ force: true });
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
});

test("creates, places, edits, and reopens an Otto scripted object", async ({
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
    page.getByRole("heading", { name: "Otto Matic", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await ottoCard(page)
    .locator('input[type="file"]')
    .setInputFiles([earthFarmLevelPath, earthFarmTexturePath]);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await createScriptObjectFromUI(page, workspace, "Otto Test Object");
  await page.getByRole("tab", { name: "Items", exact: true }).click();
  await page.getByText("Select a scripted item", { exact: true }).click();
  await page.getByRole("option", { name: "Otto Test Object", exact: true }).click();
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
  await expect(reopenedWorkspace.getByText("Otto Test Object", { exact: true }).first()).toBeVisible();
  await buildScriptWorkspaceFromUI(reopenedWorkspace);
});

test("surfaces a production Lua runtime traceback in the preview monitor", async ({
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
    page.getByRole("heading", { name: "Otto Matic", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await ottoCard(page)
    .locator('input[type="file"]')
    .setInputFiles([earthFarmLevelPath, earthFarmTexturePath]);
  const levelActions = page.getByRole("button", { name: "Level Actions", exact: true });
  await expect(levelActions).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const dialog = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await dialog.getByRole("button", { name: "Lua source", exact: true }).click();
  await dialog.getByRole("button", { name: "user.lua", exact: true }).click();

  const editorDialog = dialog;
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'local pangea = require("pangea")\nlocal entry = {}\nfunction entry.onFrame(ctx)\n  error("production traceback regression")\nend\nreturn entry',
  );
  await editorDialog.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(editorDialog.getByRole("button", { name: "Save source", exact: true })).toBeDisabled();
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
    previewDialog.getByText(/production traceback regression/, { exact: false }),
  ).toBeVisible({ timeout: 30_000 });
});

test("surfaces a native-adapter runtime load failure in the preview monitor", async ({
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
    page.getByRole("heading", { name: "Otto Matic", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await ottoCard(page)
    .locator('input[type="file"]')
    .setInputFiles([earthFarmLevelPath, earthFarmTexturePath]);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const dialog = await openScriptWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await buildScriptWorkspaceFromUI(dialog);
  await dialog
    .getByRole("button", { name: "Test with scripts", exact: true })
    .click();
  await page.route(
    "**/generated/pangea-ports/wasm/ottomatic/OttoMatic.js*",
    (route) => route.abort("failed"),
  );
  const previewDialog = page.getByRole("dialog").last();
  await previewDialog
    .getByRole("button", { name: "Launch Game", exact: true })
    .click();
  await expect(
    previewDialog.getByText("Last Error:", { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    previewDialog.locator("pre").filter({ hasText: "Failed to load" }),
  ).toBeVisible({ timeout: 30_000 });
});
