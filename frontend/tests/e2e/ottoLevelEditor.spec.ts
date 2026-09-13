import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

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
  await workspace.getByRole("button", { name: "Load", exact: true }).first().click();
  await workspace
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await workspace.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled")).toBeVisible({
    timeout: 30_000,
  });

  await workspace
    .getByRole("button", { name: "Preview with Scripts", exact: true })
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
  const openScriptsButton = page.getByRole("button", { name: "Open Scripts", exact: true });
  if ((await openScriptsButton.count()) > 0) {
    await openScriptsButton.click();
  }
  const dialog = page.getByRole("dialog").last();
  const workspace: Locator | Page = (await dialog.count()) > 0 ? dialog : page;
  await workspace.getByRole("tab", { name: "Assignments", exact: true }).click();
  await workspace.locator("#custom-object-label").fill("Otto Test Object");
  await workspace.getByRole("button", { name: "Save Object", exact: true }).click();
  await expect(workspace.getByText("Otto Test Object", { exact: true }).first()).toBeVisible();

  const visualType = workspace.getByRole("combobox", {
    name: "Otto Test Object visual type",
  });
  await visualType.click();
  await page.getByRole("option", { name: "No visual", exact: true }).click();
  await page.keyboard.press("Escape");
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
  if ((await openScriptsButton.count()) > 0) {
    await openScriptsButton.click();
  }
  const reopenedDialog = page.getByRole("dialog").last();
  const reopenedWorkspace: Locator | Page = (await reopenedDialog.count()) > 0 ? reopenedDialog : page;
  await reopenedWorkspace.getByRole("tab", { name: "Assignments", exact: true }).click();
  await expect(reopenedWorkspace.getByText("Otto Test Object", { exact: true }).first()).toBeVisible();
  await reopenedWorkspace
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await reopenedWorkspace
    .getByRole("button", { name: "Compile Bundle", exact: true })
    .click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
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
  const levelActions = page.locator("summary").filter({
    hasText: "Level Actions",
  });
  await expect(levelActions).toBeVisible({ timeout: 30_000 });

  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
  await dialog.getByRole("tab", { name: "Code", exact: true }).click();
  await dialog.getByRole("button", { name: /user\.lua Saved/ }).click();

  const editorDialog = page.getByRole("dialog").last();
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'local pangea = require("pangea")\nlocal entry = {}\nfunction entry.onFrame(ctx)\n  error("production traceback regression")\nend\nreturn entry',
  );
  await editorDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved source file", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await dialog
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
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await dialog
    .getByRole("button", { name: "Preview with Scripts", exact: true })
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
