import { expect, test, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { PNG } from "pngjs";
import { cutoutGeometry, fourViews, layeredGeometry, reconstructionPackage } from "./engineReconstructionFixtures";

async function loadPackage(page: Page, source: string) {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("generated/pangea-ports/wasm/sandbox/PangeaSandbox.html?embedded=1");
  await expect(page.locator("#package")).toBeEnabled({ timeout: 60_000 });
  await page.evaluate((files) => window.postMessage({
    type: "pangea.loadPackage", version: 1,
    files: files.map((file) => ({ path: file.path, bytes: Uint8Array.from(file.bytes) })),
  }, location.origin), reconstructionPackage(source));
  await expect(page.locator("#status")).toHaveText("Package loaded", { timeout: 30_000 });
  await expect(page.locator("#game-ui")).toBeHidden();
}

async function pixels(page: Page) {
  const bytes = await page.locator("canvas").screenshot();
  const decoded = Result.fromThrowable(() => PNG.sync.read(bytes), String)();
  return decoded.isOk() ? decoded.value : null;
}

function sample(image: PNG | null, x: number, y: number) {
  if (!image) return { r: -1, g: -1, b: -1 };
  let r = 0, g = 0, b = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const at = ((y + dy) * image.width + x + dx) * 4;
    r += image.data[at] ?? 0; g += image.data[at + 1] ?? 0; b += image.data[at + 2] ?? 0;
  }
  return { r: Math.round(r / 25), g: Math.round(g / 25), b: Math.round(b / 25) };
}

function centroid(image: PNG | null, view: number, color: "red" | "blue") {
  if (!image) return { x: 0, y: 0, count: 0 };
  const width = image.width / 2, height = image.height / 2;
  const left = (view % 2) * width, top = Math.floor(view / 2) * height;
  let x = 0, y = 0, count = 0;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const at = ((top + row) * image.width + left + column) * 4;
    const r = image.data[at] ?? 0, g = image.data[at + 1] ?? 0, b = image.data[at + 2] ?? 0;
    const matches = color === "red" ? r > 200 && g < 60 && b < 60 : b > 200 && r < 60 && g < 60;
    if (matches) { x += column; y += row; count++; }
  }
  return { x: count ? x / count - width / 2 : 0, y: count ? y / count - height / 2 : 0, count };
}

test.beforeEach(() => {
  test.skip(process.env.PANGEA_SANDBOX_RUNTIME_TEST !== "1", "Build and stage the current engine WASM runtime first.");
});

test("WASM draws secondary UVs and scrolls a layered texture from Lua", async ({ page }) => {
  await loadPackage(page, layeredGeometry);
  await expect.poll(async () => sample(await pixels(page), 300, 300).r).toBeGreaterThan(240);
  const initial = await pixels(page);
  expect(sample(initial, 300, 300).b).toBeLessThan(15);
  expect(sample(initial, 500, 300).r).toBeGreaterThan(240);
  expect(sample(initial, 500, 300).b).toBeGreaterThan(230);
  await page.locator("canvas").focus();
  await page.keyboard.down("u");
  await expect.poll(async () => sample(await pixels(page), 500, 300).b).toBeLessThan(15);
  await page.keyboard.up("u");
  expect(sample(await pixels(page), 500, 300).r).toBeGreaterThan(240);
  await expect(page.locator("#status")).toHaveText("Package loaded");
});

test("WASM alpha cutouts reveal geometry drawn behind them", async ({ page }) => {
  await loadPackage(page, cutoutGeometry);
  await expect.poll(async () => sample(await pixels(page), 520, 300).g).toBeGreaterThan(230);
  const image = await pixels(page);
  expect(sample(image, 280, 300).b).toBeGreaterThan(230);
  expect(sample(image, 280, 300).g).toBeLessThan(15);
  expect(sample(image, 520, 300).b).toBeLessThan(15);
});

test("WASM independently rolls four views and draws sprite HUDs per viewport", async ({ page }) => {
  await loadPackage(page, fourViews);
  await expect.poll(async () => centroid(await pixels(page), 0, "red").count).toBeGreaterThan(500);
  const image = await pixels(page);
  for (let view = 0; view < 4; view++) {
    const red = centroid(image, view, "red"), blue = centroid(image, view, "blue");
    expect(red.count).toBeGreaterThan(500); expect(blue.count).toBeGreaterThan(500);
    const cyan = sample(image, (view % 2) * 400 + 20, Math.floor(view / 2) * 300 + 20);
    expect(cyan.r).toBeLessThan(15); expect(cyan.g).toBeGreaterThan(240); expect(cyan.b).toBeGreaterThan(240);
  }
  expect(centroid(image, 0, "red").x).toBeGreaterThan(35);
  expect(centroid(image, 0, "blue").y).toBeLessThan(-35);
  expect(centroid(image, 1, "red").y).toBeLessThan(-35);
  expect(centroid(image, 1, "blue").x).toBeLessThan(-35);
  expect(centroid(image, 2, "red").x).toBeLessThan(-35);
  expect(centroid(image, 2, "blue").y).toBeGreaterThan(35);
  expect(centroid(image, 3, "red").y).toBeGreaterThan(35);
  expect(centroid(image, 3, "blue").x).toBeGreaterThan(35);
  expect(sample(image, 460, 20)).toEqual({ r: 255, g: 255, b: 0 });
  expect(sample(image, 60, 20)).toEqual({ r: 0, g: 0, b: 0 });
});
