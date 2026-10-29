import { expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildScriptWorkspaceFromUI, createScriptObjectFromUI, openScriptWorkspace } from "./scriptWorkspaceTestHelpers";

const fixturePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export async function authorBrainPort(page: Page, archivePath: string) {
  await page.addInitScript(() => window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
    scripting: true, multiplayer: false, itemModelMappingPreview: false,
  })));
  await page.goto("./");
  const card = page.locator("div.bg-gray-800").filter({
    has: page.getByRole("heading", { name: "Otto Matic", exact: true }),
  }).first();
  await card.locator('input[type="file"]').setInputFiles([
    fixturePath("../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc"),
    fixturePath("../../public/assets/ottoMatic/terrain/EarthFarm.ter"),
  ]);
  await expect(page.getByRole("button", { name: "Level Actions", exact: true })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const workspace = await openScriptWorkspace(page);
  await createScriptObjectFromUI(page, workspace, "Brain Port");
  await workspace.getByRole("combobox", { name: "Appearance", exact: true }).click();
  await page.getByRole("option", { name: "Uploaded BG3D model", exact: true }).click();
  await workspace.getByLabel("Upload model", { exact: true }).setInputFiles(
    fixturePath("../../public/games/ottomatic/models/level10_brainboss.bg3d"),
  );
  await expect(workspace.getByText(/^Added: Data\/Scripts\/assets\/models\//)).toBeVisible();
  await workspace.getByLabel("Model scale", { exact: true }).fill("3.5");
  await workspace.getByText("Native asset details", { exact: true }).click();
  await workspace.getByLabel("Model object ID", { exact: true }).fill("5");
  await workspace.getByLabel("Model object ID", { exact: true }).blur();
  await workspace.getByRole("button", { name: "Edit behavior", exact: true }).click();
  await workspace.locator(".monaco-editor").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(await readFile(fixturePath("../fixtures/brainPort.lua"), "utf8"));
  await workspace.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(workspace.getByRole("button", { name: "Save source", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Items", exact: true }).click();
  await page.getByRole("combobox", { name: "Custom item", exact: true }).click();
  await page.getByRole("option", { name: "Brain Port", exact: true }).click();
  const canvas = page.locator("canvas").last();
  await canvas.click({ position: { x: 600, y: 140 } });
  await canvas.click({ position: { x: 600, y: 140 } });
  await expect(page.locator("#scripted-item-x")).toBeVisible();
  await page.locator("#scripted-item-x").fill("340");
  await page.locator("#scripted-item-y").fill("0");
  await page.locator("#scripted-item-z").fill("2150");
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  const reopened = await openScriptWorkspace(page);
  await buildScriptWorkspaceFromUI(reopened);
  const downloading = page.waitForEvent("download");
  await reopened.getByRole("button", { name: "Export script package", exact: true }).click();
  const download = await downloading;
  await download.saveAs(archivePath);
  return archivePath;
}
