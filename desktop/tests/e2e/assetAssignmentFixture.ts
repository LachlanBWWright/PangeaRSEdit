import * as fs from "node:fs/promises";
import path from "node:path";
import type { ElectronApplication, Page } from "@playwright/test";
import { expect } from "@playwright/test";

function indexedImage(color: number) {
  const bytes = new Uint8Array(788);
  bytes[1] = 1; bytes[2] = 1; bytes[7] = 24; bytes[16] = 8;
  const view = new DataView(bytes.buffer);
  view.setUint16(5, 256, true); view.setUint16(12, 2, true); view.setUint16(14, 1, true);
  bytes.fill(color, 18, 786); bytes.set([13, 72], 786);
  return bytes;
}

export async function assignPalette(page: Page, application: ElectronApplication, folder: string) {
  const data = path.join(path.dirname(folder), "stock-data");
  await fs.mkdir(path.join(data, "Images"), { recursive: true });
  await fs.writeFile(path.join(data, "Images/farm.tga"), indexedImage(1));
  const profile = await application.evaluate(({ app }) => app.getPath("userData"));
  await fs.mkdir(path.join(profile, "games"), { recursive: true });
  await fs.writeFile(path.join(profile, "games/installed.json"), JSON.stringify([{ game: "OttoMatic", managed: false,
    version: "fixture", executable: process.execPath, data, assetRootVersion: 2 }]));
  await page.evaluate(() => window.pangeaDesktop?.request({ operation: "games.installed" }));
  await fs.mkdir(path.join(folder, "Assets"), { recursive: true });
  await fs.writeFile(path.join(folder, "Assets/custom.palette.tga"), indexedImage(93));
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Asset Assignments/ }).click();
  const dialog = page.getByRole("dialog", { name: "Asset assignments", exact: true });
  await expect(dialog.getByRole("option", { name: "Assets/custom.palette.tga", exact: true })).toHaveCount(1, { timeout: 10000 });
  await dialog.getByRole("button", { name: "Load targets from installed game", exact: true }).click();
  await dialog.getByRole("combobox", { name: /^Project source asset/ }).selectOption("Assets/custom.palette.tga");
  await dialog.getByRole("combobox", { name: /^Native replacement target/ }).selectOption("Data/Images/farm.tga");
  await expect(dialog.getByRole("checkbox", { name: /Replace palette colors only/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Add assignment", exact: true }).click();
  await expect(dialog.getByText(/custom.palette.tga → Data\/Images\/farm.tga/)).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
}
