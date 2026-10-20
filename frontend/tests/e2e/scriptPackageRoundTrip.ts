import { expect, type Locator, type Page } from "@playwright/test";
import { Result, ResultAsync } from "neverthrow";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildScriptWorkspaceFromUI, loadScriptSampleFromUI } from "./scriptWorkspaceTestHelpers";
import {
  compareNormalizedLifecycleTraces,
  type PangeaScriptLifecycleTrace,
} from "../../src/editor/utils/scriptRuntimeStatus";

const lifecycleTraceSchema = z.object({
  eventCount: z.number().int().nonnegative(),
  entryCount: z.number().int().nonnegative(),
  overflow: z.boolean(),
  entries: z.array(z.object({
    eventId: z.string(),
    applicationPhase: z.string(),
    order: z.number().int().nonnegative(),
    targetId: z.number().int(),
    targetGeneration: z.number().int().nonnegative(),
    status: z.number().int(),
  })),
});

async function readLifecycleTrace(page: Page): Promise<PangeaScriptLifecycleTrace | null> {
  const traceResult = await ResultAsync.fromPromise(page.evaluate(() => {
    const runtime = window.Module;
    if (!runtime?.ccall) return null;
    return runtime.ccall(
      "PangeaScript_GetStatusLifecycleTraceJSON",
      "string",
      [],
      [],
    );
  }), () => null);
  const rawTrace = traceResult.unwrapOr(null);
  if (rawTrace === null) return null;
  const parsedJSON = Result.fromThrowable(
    () => JSON.parse(rawTrace),
    () => null,
  )().unwrapOr(null);
  const parsedTrace = lifecycleTraceSchema.safeParse(parsedJSON);
  return parsedTrace.success ? parsedTrace.data : null;
}
async function getScriptsWorkspace(page: Page): Promise<Locator> {
  const dialogs = page.getByRole("dialog");
  if ((await dialogs.count()) > 0 && (await dialogs.first().isVisible())) {
    return dialogs.first();
  }
  return page.locator("body");
}

async function openScriptsWorkspace(page: Page): Promise<Locator> {
  const openScripts = page.getByRole("button", {
    name: "Open Scripts",
    exact: true,
  });
  if ((await openScripts.count()) > 0 && (await openScripts.first().isVisible())) {
    await openScripts.first().click();
  }
  const workspace = await getScriptsWorkspace(page);
  await expect(
    workspace.getByRole("button", { name: "Level events", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  return workspace;
}

export async function runScriptPackageRoundTrip(
  page: Page,
  card: Locator,
  levelFiles: readonly string[],
): Promise<void> {
  await card.locator('input[type="file"]').setInputFiles([...levelFiles]);
  const levelActions = page
    .locator("summary")
    .filter({ hasText: "Level Actions" })
    .or(page.getByRole("button", { name: "Level Actions", exact: true }));
  await expect(levelActions).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  let dialog = await openScriptsWorkspace(page);
  await loadScriptSampleFromUI(dialog);
  await buildScriptWorkspaceFromUI(dialog);

  const downloadLevelVariant = async (name: string, pattern: RegExp): Promise<void> => {
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await dialog.getByRole("button", { name, exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(pattern);
  };
  await downloadLevelVariant("Export extended level", /^extended-level-.*\.zip$/);
  await downloadLevelVariant(
    "Export without scripts",
    /^original-level-.*\.zip$/,
  );

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await dialog.getByRole("button", { name: "Export script package", exact: true }).click();
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
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  dialog = await openScriptsWorkspace(page);
  await buildScriptWorkspaceFromUI(dialog);

  await dialog.getByRole("button", { name: "Test with scripts", exact: true }).click();
  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("button", { name: "Launch Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await previewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
  await previewDialog
    .getByRole("button", { name: "Reload Game", exact: true })
    .click({ force: true });
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
  await expect.poll(() => readLifecycleTrace(page), { timeout: 30_000 }).not.toBeNull();
  const scriptedLifecycleTrace = await readLifecycleTrace(page);
  expect(scriptedLifecycleTrace).not.toBeNull();
  await previewDialog
    .getByRole("button", { name: "Close", exact: true })
    .dispatchEvent("click");
  await expect(previewDialog).toHaveAttribute("data-state", "closed", {
    timeout: 5_000,
  });
  const editorLevelActions = page
    .locator("summary")
    .filter({ hasText: "Level Actions" })
    .or(page.getByRole("button", { name: "Level Actions", exact: true }));
  if (!(await editorLevelActions.isVisible())) {
    const itemsTab = page.getByRole("tab", { name: "Items", exact: true });
    if (await itemsTab.isVisible()) {
      await itemsTab.click();
    }
  }
  await expect(editorLevelActions).toBeVisible({ timeout: 30_000 });
  await editorLevelActions.click();
  await page.getByRole("menuitem", { name: "Preview in Game (no scripts)", exact: true }).click();
  const nativePreviewDialog = page.getByRole("dialog").last();
  await nativePreviewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    nativePreviewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await nativePreviewDialog.getByRole("button", { name: "Reload Game", exact: true }).click();
  await expect(
    nativePreviewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => readLifecycleTrace(page), { timeout: 30_000 }).not.toBeNull();
  const nativeLifecycleTrace = await readLifecycleTrace(page);
  expect(nativeLifecycleTrace).not.toBeNull();
  if (scriptedLifecycleTrace === null || nativeLifecycleTrace === null) return;
  expect(compareNormalizedLifecycleTraces(
    scriptedLifecycleTrace,
    nativeLifecycleTrace,
  )).toEqual({
    matches: true,
    firstMismatchIndex: null,
    reason: null,
  });
  await nativePreviewDialog.getByRole("button", { name: "Close", exact: true }).click();
}
