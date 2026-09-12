import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { runScriptObjectAuthoringRoundTrip } from "./scriptObjectAuthoringRoundTrip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapPath = path.resolve(
  __dirname,
  "../../public/assets/mightyMike/terrain/candy.map-1",
);
const tilesetPath = path.resolve(
  __dirname,
  "../../public/assets/mightyMike/terrain/candy.tileset",
);

function mightyMikeCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Mighty Mike", exact: true }),
    })
    .first();
}

test("exports, reopens, and recompiles a Mighty Mike script package", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Mighty Mike", exact: true })).toBeVisible({ timeout: 30_000 });
  await runScriptPackageRoundTrip(page, mightyMikeCard(page), [mapPath, tilesetPath]);
});

test("creates, places, edits, and reopens a Mighty Mike scripted object", async ({
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
  await expect(page.getByRole("heading", { name: "Mighty Mike", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptObjectAuthoringRoundTrip(
    page,
    mightyMikeCard(page),
    [mapPath, tilesetPath],
    "Mighty Mike Test Object",
  );
});

test("uses the production Mighty Mike Scripts workspace through preview launch", async ({
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
    page.getByRole("heading", { name: "Mighty Mike", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await mightyMikeCard(page)
    .locator('input[type="file"]')
    .setInputFiles([mapPath, tilesetPath]);
  await expect(
    page.locator("summary").filter({ hasText: "Level Actions" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled")).toBeVisible({
    timeout: 30_000,
  });
  await dialog.getByRole("button", { name: "Preview with Scripts", exact: true }).click();

  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("heading", { name: /Preview in Mighty Mike/i }),
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

test("surfaces a production Lua runtime traceback in the Mighty Mike preview monitor", async ({
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
    page.getByRole("heading", { name: "Mighty Mike", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await mightyMikeCard(page)
    .locator('input[type="file"]')
    .setInputFiles([mapPath, tilesetPath]);
  await expect(
    page.getByRole("button", { name: "Level Actions", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Load", exact: true }).first().click();
  await page.getByRole("tab", { name: "Code", exact: true }).click();
  await page.getByRole("button", { name: /user\.lua Saved/ }).click();

  const editorDialog = page.getByRole("dialog").last();
  await editorDialog.locator(".monaco-editor").click();
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText(
    'local pangea = require("pangea")\nlocal entry = {}\nfunction entry.onAreaFrame(ctx)\n  error("mighty mike production traceback regression")\nend\nreturn entry',
  );
  await editorDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved source file", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("tab", { name: "Preview and Export", exact: true }).click();
  await page.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Preview with Scripts", exact: true }).click();
  const previewDialog = page.getByRole("dialog").last();
  await previewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("Last Error:", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    previewDialog.getByText(/mighty mike production traceback regression/, {
      exact: false,
    }),
  ).toBeVisible({ timeout: 30_000 });
});
