import * as fs from "node:fs/promises";
import path from "node:path";
import { ResultAsync } from "neverthrow";
import { test, expect } from "./desktopFixture.ts";

function indexedPaletteImage() {
  const bytes = new Uint8Array(18 + 768 + 256);
  const header = new DataView(bytes.buffer);
  bytes[1] = 1; bytes[2] = 1; bytes[7] = 24; bytes[16] = 8; bytes[17] = 0x20;
  header.setUint16(5, 256, true); header.setUint16(12, 256, true); header.setUint16(14, 1, true);
  for (let index = 0; index < 256; index++) {
    bytes[18 + index * 3] = index;
    bytes[19 + index * 3] = index;
    bytes[20 + index * 3] = index;
    bytes[786 + index] = index;
  }
  bytes[18] = 211; bytes[19] = 123; bytes[20] = 37;
  return bytes;
}

test("reopens an exported indexed TGA and closes its document after external deletion", async ({ desktop }) => {
  const { page, application, folder } = desktop;
  await application.evaluate(({ dialog }, selected) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
  }, folder);
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /New Project/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("Asset lifecycle");
  await page.getByRole("combobox", { name: /^Game/ }).selectOption("MightyMike");
  await page.getByRole("button", { name: "Choose folder and create", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const relative = "Assets/sprites/lifecycle.tga";
  const location = path.join(folder, relative);
  await fs.mkdir(path.dirname(location), { recursive: true });
  await fs.writeFile(location, indexedPaletteImage());
  await page.goto("pangea://editor/index.html#/sprite-viewer");
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Project Assets/ }).click();
  const assets = page.getByRole("dialog", { name: "Project sprites", exact: true });
  await expect(assets.getByRole("combobox", { name: /^Project asset/ })).toContainText(relative);
  await assets.getByRole("combobox", { name: /^Project asset/ }).selectOption(relative);
  await expect(assets.getByRole("button", { name: "Save asset to project", exact: true })).toBeEnabled();
  await assets.getByRole("button", { name: "Save asset to project", exact: true }).click();
  await expect(page.getByText("Asset saved to project", { exact: true })).toBeVisible();
  await assets.getByRole("button", { name: "Close", exact: true }).click();
  expect((await fs.readFile(location))[2]).toBe(1);

  await page.reload();
  await expect(page.getByRole("heading", { name: "No Content Loaded", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Project Assets/ }).click();
  await assets.getByRole("combobox", { name: /^Project asset/ }).selectOption(relative);
  await expect(assets.getByRole("button", { name: "Save asset to project", exact: true })).toBeEnabled();
  await assets.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByText("Loaded: lifecycle.tga", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return Array.from(canvas?.getContext("2d")?.getImageData(0, 0, 1, 1).data ?? []);
  })).toEqual([37, 123, 211, 255]);
  await expect(page.getByLabel("Unsaved changes", { exact: true })).not.toBeVisible();

  await fs.unlink(location);
  await expect(page.getByRole("heading", { name: "No Content Loaded", exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.getByText("Loaded: lifecycle.tga", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Project menu", exact: true }).click();
  await page.getByRole("menuitem", { name: /Save All/ }).click();
  await expect(page.getByLabel("Unsaved changes", { exact: true })).not.toBeVisible();
  const recreated = await ResultAsync.fromPromise(fs.stat(location), () => "Asset remains deleted");
  expect(recreated.isErr()).toBe(true);
});
