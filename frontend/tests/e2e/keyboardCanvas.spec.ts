import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const frontend = resolve(import.meta.dirname, "../..");

test("paints an undoable terrain stroke with the keyboard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("./");
  const gameCard = page.locator("div.bg-gray-800").filter({
    has: page.getByRole("heading", { name: "Otto Matic", exact: true }),
  }).first();
  await gameCard.locator('input[type="file"]').setInputFiles([
    resolve(frontend, "src/data/levelFiles/level1Hard/EarthFarm.ter.rsrc"),
    resolve(frontend, "public/assets/ottoMatic/terrain/EarthFarm.ter"),
  ]);
  await page.getByRole("tab", { name: "Tiles", exact: true }).click();
  await page.getByRole("tab", { name: "Topology", exact: true }).click();

  const map = page.getByRole("application", { name: "Map canvas" });
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  await expect(undo).toBeDisabled();
  await map.focus();
  await page.keyboard.press("Space");
  await expect(map.getByRole("status")).toHaveText("Pointer held");
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Shift+ArrowRight");
  }
  await page.keyboard.press("Space");
  await expect(map.getByRole("status")).toHaveText("Pointer released");
  await expect(undo).toBeEnabled();
  await undo.click();
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
});

test("paints sprite pixels with the keyboard", async ({ page }) => {
  await page.goto("./#/sprite-viewer");
  await page.locator('input[type="file"]').setInputFiles(
    resolve(frontend, "public/data/mightymike/shapes/weapon.shapes"),
  );
  const sprite = page.getByRole("application", { name: "Sprite canvas" });
  const canvas = sprite.locator("canvas");
  await page.getByRole("button", { name: "Paint", exact: true }).click();
  await page.getByRole("slider", { name: "Palette index" }).press("End");
  const before = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());

  await sprite.focus();
  await page.keyboard.press("Space");
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.press("Space");

  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())).not.toBe(before);
});
