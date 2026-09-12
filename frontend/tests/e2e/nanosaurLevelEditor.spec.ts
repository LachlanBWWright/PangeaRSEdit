import {
  test,
  expect,
  type Locator,
  type Download,
  type Page,
} from "@playwright/test";
import { Buffer } from "node:buffer";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { runScriptRuntimeTraceback } from "./scriptRuntimeTraceback";
import { openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nanosaurLevelPath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur/terrain/Level1.ter",
);
const nanosaurTexturePath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur/terrain/Level1.trt",
);

function nanosaurCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Nanosaur", exact: true }),
    })
    .first();
}

function levelActionsSummary(page: Page): Locator {
  return page
    .locator("summary")
    .filter({ hasText: "Level Actions" })
    .or(page.getByRole("button", { name: "Level Actions", exact: true }));
}

async function uploadNanosaurLevelFiles(page: Page): Promise<void> {
  const card = nanosaurCard(page);
  const input = card.locator('input[type="file"]');
  await input.setInputFiles([nanosaurLevelPath, nanosaurTexturePath]);
}

test.describe("Nanosaur level editor", () => {
  test("parses uploaded nanosaur level and enables editor actions", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);

    await expect(levelActionsSummary(page)).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByText("Failed to parse level data")).toHaveCount(0);
    await expect(page.getByText("Failed to load textures")).toHaveCount(0);
  });

  test("downloads nanosaur terrain and texture files", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);

    await expect(levelActionsSummary(page)).toBeVisible({
      timeout: 30000,
    });

    const downloads: Download[] = [];
    page.on("download", (download) => {
      downloads.push(download);
    });

    await levelActionsSummary(page).click();
    await page
      .getByRole("button", { name: "Download Level", exact: true })
      .click();

    await expect
      .poll(() => downloads.length, {
        timeout: 10000,
      })
      .toBeGreaterThanOrEqual(2);

    const suggestedNames = downloads.map((download) =>
      download.suggestedFilename(),
    );
    expect(suggestedNames.some((name) => name.endsWith(".ter"))).toBeTruthy();
    expect(suggestedNames.some((name) => name.endsWith(".trt"))).toBeTruthy();
  });

  test("round-trips the downloaded nanosaur level through the production uploader", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);
    await expect(levelActionsSummary(page)).toBeVisible({ timeout: 30000 });

    const downloads: Download[] = [];
    page.on("download", (download) => {
      downloads.push(download);
    });
    await levelActionsSummary(page).click();
    await page
      .getByRole("button", { name: "Download Level", exact: true })
      .click();
    await expect
      .poll(() => downloads.length, { timeout: 10000 })
      .toBe(2);

    const uploadedFiles: {
      name: string;
      mimeType: string;
      buffer: Buffer;
    }[] = [];
    for (const download of downloads) {
      const downloadPath = await download.path();
      expect(downloadPath).not.toBeNull();
      if (downloadPath === null) {
        return;
      }
      uploadedFiles.push({
        name: download.suggestedFilename(),
        mimeType: "application/octet-stream",
        buffer: Buffer.from(await readFile(downloadPath)),
      });
    }

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();
    await nanosaurCard(page)
      .locator('input[type="file"]')
      .setInputFiles(uploadedFiles);
    await expect(levelActionsSummary(page)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Failed to parse level data")).toHaveCount(0);
    await expect(page.getByText("Failed to load textures")).toHaveCount(0);
  });

  test("exports the production scripting packages from the Scripts workspace", async ({
    page,
  }) => {
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
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);
    await expect(levelActionsSummary(page)).toBeVisible({ timeout: 30000 });

    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    const dialog = await openScriptWorkspace(page);
    await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
    await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
    await dialog.getByRole("tab", { name: "Preview and Export", exact: true }).click();

    await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
    await expect(page.getByText("Script bundle compiled")).toBeVisible({
      timeout: 30000,
    });

    const downloadArchive = async (name: string): Promise<Download> => {
      const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
      await dialog.getByRole("button", { name, exact: true }).click();
      return downloadPromise;
    };

    const extendedDownload = await downloadArchive("Download Extended Package");
    expect(extendedDownload.suggestedFilename()).toMatch(
      /^extended-level-.*\.zip$/,
    );
    const originalDownload = await downloadArchive(
      "Download Original-Compatible Level",
    );
    expect(originalDownload.suggestedFilename()).toMatch(
      /^original-compatible-.*\.zip$/,
    );
    const scriptDownload = await downloadArchive("Download Script Package");
    const scriptPackageFilename = scriptDownload.suggestedFilename();
    expect(scriptPackageFilename).toMatch(/^scripts-.*\.zip$/);
    const scriptPackagePath = await scriptDownload.path();
    const scriptPackageBytes = await readFile(scriptPackagePath);
    await dialog
      .getByLabel("Upload Script Package", { exact: true })
      .setInputFiles({
        name: scriptPackageFilename,
        mimeType: "application/zip",
        buffer: scriptPackageBytes,
      });
    await expect(page.getByText(/Imported /)).toBeVisible({ timeout: 30000 });
  });

  test("runs the uploaded Nanosaur level through scripted and native previews", async ({
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
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await runScriptPackageRoundTrip(page, nanosaurCard(page), [
      nanosaurLevelPath,
      nanosaurTexturePath,
    ]);
  });

  test("renders production source-validation diagnostics after editing a script", async ({
    page,
  }) => {
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
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await uploadNanosaurLevelFiles(page);
    await expect(levelActionsSummary(page)).toBeVisible({ timeout: 30000 });
    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    await page.getByRole("button", { name: "Open Scripts", exact: true }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
    await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
    await dialog.getByRole("tab", { name: "Code", exact: true }).click();
    await dialog.getByRole("button", { name: "Open Editor", exact: true }).click();

    const editorDialog = page.getByRole("dialog").last();
    await editorDialog.locator(".monaco-editor").click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("function onUnsupportedHook(ctx)\nend");
    await editorDialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editorDialog.getByText(/preflight warning/)).toBeVisible();
    await expect(page.getByText("Saved source file", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await dialog.getByRole("button", { name: "Compile", exact: true }).click();
    await expect(page.getByText("Script bundle compiled", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("creates and validates a custom object through the production workspace", async ({
    page,
  }) => {
    test.setTimeout(90000);
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
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible({ timeout: 30000 });

    await uploadNanosaurLevelFiles(page);
    await expect(levelActionsSummary(page)).toBeVisible({ timeout: 30000 });
    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    const openScriptsButton = page.getByRole("button", { name: "Open Scripts", exact: true });
    if ((await openScriptsButton.count()) > 0) {
      await openScriptsButton.click();
    }
    const dialog = page.getByRole("dialog").last();
    const workspace: Locator | Page = (await dialog.count()) > 0 ? dialog : page;
    await workspace.getByRole("tab", { name: "Assignments", exact: true }).click();
    await workspace.locator("#custom-object-label").fill("Nanosaur Test Object");
    await workspace.getByRole("button", { name: "Save Object", exact: true }).click();
    await expect(workspace.getByText("Nanosaur Test Object", { exact: true }).first()).toBeVisible();

    const visualType = workspace.getByRole("combobox", {
      name: "Nanosaur Test Object visual type",
    });
    await visualType.click();
    await page.getByRole("option", { name: "No visual", exact: true }).click();

    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Items", exact: true }).click();
    await expect(page.getByText("Scripted items", { exact: true })).toBeVisible();
    await page.getByText("Select a scripted item", { exact: true }).click();
    await page
      .getByRole("option", { name: "Nanosaur Test Object", exact: true })
      .click();
    await page.waitForTimeout(250);
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
    await reopenedWorkspace
      .getByRole("tab", { name: "Assignments", exact: true })
      .click();
    await expect(reopenedWorkspace.getByText("Nanosaur Test Object", { exact: true }).first()).toBeVisible();

    await reopenedWorkspace
      .getByRole("tab", { name: "Preview and Export", exact: true })
      .click();
    await reopenedWorkspace
      .getByRole("button", { name: "Compile Bundle", exact: true })
      .click();
    await expect(page.getByText("Script bundle compiled")).toBeVisible({
      timeout: 30000,
    });

    await reopenedWorkspace
      .getByRole("button", { name: "Preview with Scripts", exact: true })
      .click();
    const previewDialog = page.getByRole("dialog").last();
    await expect(
      previewDialog.getByRole("heading", {
        name: /Preview in Nanosaur/i,
      }),
    ).toBeVisible({ timeout: 30000 });
    await previewDialog
      .getByRole("button", { name: "Launch Game", exact: true })
      .click();
    await expect(
      previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(previewDialog.getByText("Host Status:", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
    await previewDialog.getByRole("button", { name: "Reload Game", exact: true }).click();
    await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
  });

  test("surfaces a production Lua runtime traceback in Nanosaur", async ({
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
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await runScriptRuntimeTraceback(
      page,
      nanosaurCard(page),
      [nanosaurLevelPath, nanosaurTexturePath],
      "nanosaur production traceback regression",
    );
  });
});
