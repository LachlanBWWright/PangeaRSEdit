import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptObjectAuthoringRoundTrip } from "./scriptObjectAuthoringRoundTrip";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const levelPath = path.resolve(
  __dirname,
  "../../public/assets/billyFrontier/terrain/town_duel.ter.rsrc",
);
const texturePath = path.resolve(
  __dirname,
  "../../public/assets/billyFrontier/terrain/town_duel.ter",
);

function billyCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Billy Frontier", exact: true }),
    })
    .first();
}

test("uses the production Billy Frontier Scripts workspace through preview launch", async ({
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
    page.getByRole("heading", { name: "Billy Frontier", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await billyCard(page)
    .locator('input[type="file"]')
    .setInputFiles([levelPath, texturePath]);
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
    previewDialog.getByRole("heading", { name: /Preview in Billy Frontier/i }),
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
});

test("creates, places, edits, and reopens a Billy Frontier scripted object", async ({
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
  await expect(page.getByRole("heading", { name: "Billy Frontier", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptObjectAuthoringRoundTrip(page, billyCard(page), [levelPath, texturePath], "Billy Test Object");
});

test("exports, reopens, and recompiles a Billy Frontier script package", async ({
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
    page.getByRole("heading", { name: "Billy Frontier", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await billyCard(page)
    .locator('input[type="file"]')
    .setInputFiles([levelPath, texturePath]);
  await expect(
    page.locator("summary").filter({ hasText: "Level Actions" }),
  ).toBeVisible({ timeout: 30_000 });

  const openScripts = async (): Promise<Locator> => {
    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    await page.getByRole("button", { name: "Open Scripts", exact: true }).click();
    const scriptsDialog = page.getByRole("dialog");
    await expect(scriptsDialog).toBeVisible();
    return scriptsDialog;
  };

  let dialog = await openScripts();
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true }).last()).toBeVisible({
    timeout: 30_000,
  });

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await dialog.getByRole("button", { name: "Download Script Package", exact: true }).click();
  const download = await downloadPromise;
  const packagePath = await download.path();
  expect(packagePath).not.toBeNull();
  if (packagePath === null) return;
  await dialog
    .getByLabel("Upload Script Package", { exact: true })
    .setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "application/zip",
      buffer: await readFile(packagePath),
    });
  await expect(page.getByText(/Imported /)).toBeVisible({ timeout: 30_000 });

  await page.keyboard.press("Escape");
  dialog = await openScripts();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true }).last()).toBeVisible({
    timeout: 30_000,
  });
});
