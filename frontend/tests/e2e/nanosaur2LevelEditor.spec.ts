import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptObjectAuthoringRoundTrip } from "./scriptObjectAuthoringRoundTrip";
import { runScriptRuntimeTraceback } from "./scriptRuntimeTraceback";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const levelPath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur2/terrain/level1.ter.rsrc",
);
const texturePath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur2/terrain/level1.ter",
);

function nanosaur2Card(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Nanosaur 2", exact: true }),
    })
    .first();
}

test("uses the production Nanosaur 2 Scripts workspace through preview launch", async ({
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
    page.getByRole("heading", { name: "Nanosaur 2", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await nanosaur2Card(page)
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
    previewDialog.getByRole("heading", { name: /Preview in Nanosaur 2/i }),
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

test("surfaces a production Lua runtime traceback in Nanosaur 2", async ({
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
  await expect(page.getByRole("heading", { name: "Nanosaur 2", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptRuntimeTraceback(
    page,
    nanosaur2Card(page),
    [levelPath, texturePath],
    "nanosaur2 production traceback regression",
  );
});

test("creates, places, edits, and reopens a Nanosaur 2 scripted object", async ({
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
  await expect(page.getByRole("heading", { name: "Nanosaur 2", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptObjectAuthoringRoundTrip(page, nanosaur2Card(page), [levelPath, texturePath], "Nanosaur 2 Test Object");
});

test("exports, reopens, and recompiles a Nanosaur 2 script package", async ({
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
    page.getByRole("heading", { name: "Nanosaur 2", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await nanosaur2Card(page)
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
  const packageFilename = download.suggestedFilename();
  await dialog
    .getByLabel("Upload Script Package", { exact: true })
    .setInputFiles({
      name: packageFilename,
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
