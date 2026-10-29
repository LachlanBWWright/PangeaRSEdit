import * as fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ResultAsync } from "neverthrow";
import { test, expect } from "./desktopFixture.ts";

test("original Otto data supplies the home model and every visible Earth Farm pool", async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  const dataRoot = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data");
  const registry = path.join(profile, "games");
  const saved = await ResultAsync.fromPromise(fs.mkdir(registry, { recursive: true }).then(() =>
    fs.writeFile(path.join(registry, "assets.json"), JSON.stringify([{
      game: "OttoMatic", version: "original", root: path.dirname(dataRoot),
      source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
    }]))), () => "Cannot prepare original data fixture");
  expect(saved.isOk()).toBe(true);
  const restarted = await desktop.restart();
  expect(restarted).not.toBeNull();
  if (!restarted) return;
  const { page } = restarted;
  const blockedTextures: string[] = [];
  page.on("console", (message) => {
    if (/violates.*Content Security Policy|Couldn't load texture/.test(message.text())) blockedTextures.push(message.text());
  });
  await page.setViewportSize({ width: 1800, height: 1100 });
  const card = page.locator("div.bg-gray-800").filter({
    has: page.getByRole("heading", { name: "Otto Matic", exact: true }),
  }).first();
  await expect(card.getByRole("button", { name: "Get game data", exact: true })).toHaveCount(0);
  await expect(card.locator("canvas")).toBeVisible();
  const preview = await page.evaluate(async () => {
    const response = await fetch("/game-assets/OttoMatic/preview/home.glb");
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, header: Array.from(bytes.slice(0, 4)), source: response.headers.get("X-Pangea-Asset-Source") };
  });
  expect(preview).toEqual({ status: 200, header: [103, 108, 84, 70], source: "derived:OttoMatic" });
  await expect.poll(async () => {
    const screenshot = await ResultAsync.fromPromise(card.locator("canvas").screenshot(), () => "Cannot capture home preview");
    if (screenshot.isErr()) return false;
    const stats = await ResultAsync.fromPromise(sharp(screenshot.value).stats(), () => "Cannot inspect home preview");
    return stats.isOk() && stats.value.channels.some((channel) => channel.max - channel.min > 30);
  }, { timeout: 15_000 }).toBe(true);
  expect(blockedTextures).toEqual([]);
  await card.locator('input[type="file"]').setInputFiles([
    path.join(dataRoot, "Terrain/EarthFarm.ter.rsrc"), path.join(dataRoot, "Terrain/EarthFarm.ter"),
  ]);
  await page.getByRole("tab", { name: "Water", exact: true }).click();
  const canvas = page.locator(".konvajs-content");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  await page.mouse.click(bounds.x + 947, bounds.y + 206);
  await expect(page.getByText("Water Body 0 (Blue Water)", { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const screenshot = await ResultAsync.fromPromise(canvas.screenshot(), () => "Cannot capture rendered pools");
    if (screenshot.isErr()) return 0;
    const decoded = await ResultAsync.fromPromise(sharp(screenshot.value).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), () => "Cannot inspect rendered pools");
    if (decoded.isErr()) return 0;
    const { data, info } = decoded.value;
    return [[947, 180], [938, 330], [820, 530], [1010, 520], [1085, 180]].filter(([x, y]) => {
      if (x === undefined || y === undefined) return false;
      const offset = (y * info.width + x) * info.channels;
      const red = data[offset] ?? 255;
      return (data[offset + 1] ?? 0) > red + 20 && (data[offset + 2] ?? 0) > red + 20;
    }).length;
  }, { timeout: 15_000 }).toBe(5);
});

test("missing original assets show an actionable error and recover after data is repaired", async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  const original = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data");
  const dataRoot = path.join(desktop.folder, "original-data");
  await fs.mkdir(path.join(dataRoot, "Skeletons"), { recursive: true });
  for (const name of ["Otto.bg3d", "Otto.skeleton.rsrc"]) {
    await fs.copyFile(path.join(original, "Skeletons", name), path.join(dataRoot, "Skeletons", name));
  }
  const registry = path.join(profile, "games");
  await fs.mkdir(registry, { recursive: true });
  await fs.writeFile(path.join(registry, "assets.json"), JSON.stringify([{
    game: "OttoMatic", version: "original", root: path.dirname(dataRoot), source: "upstream", dataRoot,
    releaseUrl: "https://example.com/original.zip",
  }]));
  const restarted = await desktop.restart();
  expect(restarted).not.toBeNull();
  if (!restarted) return;
  const { page } = restarted;
  const alert = page.getByRole("alert").filter({ hasText: "Some game assets could not be loaded" });
  await expect(alert).toContainText("Missing OttoMatic asset: Data/Models/global.bg3d", { timeout: 30_000 });
  await expect(alert.getByRole("button", { name: "Manage game data" })).toBeVisible();
  await fs.mkdir(path.join(dataRoot, "Models"));
  await fs.copyFile(path.join(original, "Models/global.bg3d"), path.join(dataRoot, "Models/global.bg3d"));
  const reloaded = page.waitForResponse((response) => response.url().includes("/Data/Models/global.bg3d") && response.status() === 200);
  await alert.getByRole("button", { name: "Retry asset loading" }).click();
  await reloaded;
  await expect(alert).toHaveCount(0);
  await expect(page.getByText("Model Loading Error", { exact: true })).toHaveCount(0);
});

test("a failed home preview retries conversion after its native inputs are restored", async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  const dataRoot = path.join(desktop.folder, "incomplete-data");
  const original = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data");
  await fs.mkdir(dataRoot);
  const registry = path.join(profile, "games");
  await fs.mkdir(registry, { recursive: true });
  await fs.writeFile(path.join(registry, "assets.json"), JSON.stringify([{
    game: "OttoMatic", version: "original", root: path.dirname(dataRoot), source: "upstream", dataRoot,
    releaseUrl: "https://example.com/original.zip",
  }]));
  const restarted = await desktop.restart();
  expect(restarted).not.toBeNull();
  if (!restarted) return;
  const { page } = restarted;
  await expect(page.getByText("Model Loading Error", { exact: true })).toBeVisible({ timeout: 30_000 });
  await fs.mkdir(path.join(dataRoot, "Skeletons"));
  await fs.mkdir(path.join(dataRoot, "Models"));
  for (const name of ["Otto.bg3d", "Otto.skeleton.rsrc"]) {
    await fs.copyFile(path.join(original, "Skeletons", name), path.join(dataRoot, "Skeletons", name));
  }
  await fs.copyFile(path.join(original, "Models/global.bg3d"), path.join(dataRoot, "Models/global.bg3d"));
  const converted = page.waitForResponse((response) => response.url().includes("/preview/home.glb") && response.status() === 200);
  await page.getByRole("button", { name: "Retry asset loading", exact: true }).click();
  await converted;
  await expect(page.getByText("Model Loading Error", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("alert").filter({ hasText: "Some game assets could not be loaded" })).toHaveCount(0);
});
