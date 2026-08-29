import { expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

export async function runScriptPackageRoundTrip(
  page: Page,
  card: Locator,
  levelFiles: readonly string[],
): Promise<void> {
  await card.locator('input[type="file"]').setInputFiles([...levelFiles]);
  await expect(
    page.locator("summary").filter({ hasText: "Level Actions" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();

  let dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
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
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled", { exact: true }).last()).toBeVisible({
    timeout: 30_000,
  });
}
