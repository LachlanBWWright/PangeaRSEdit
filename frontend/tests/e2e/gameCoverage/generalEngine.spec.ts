import { expect, test, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { resolve } from "node:path";
import { PNG } from "pngjs";

const stateSchema = z.object({
  actors: z.number().int(), models: z.number().int(), meshes: z.number().int(), materials: z.number().int(),
  chunks: z.number().int(), vertices: z.number().int(), triangles: z.number().int(), density: z.number().int(),
  sampleHeight: z.number(), resourceTypes: z.number().int(), resources: z.number().int(),
  actorX: z.number(), actorZ: z.number(), group: z.number().int(),
});

async function state(page: Page) {
  const raw = await page.evaluate(() => window.Module?.ccall?.("PangeaSandbox_GetState", "string", [], []));
  const text = z.string().safeParse(raw);
  if (!text.success) return null;
  const decoded = Result.fromThrowable((): unknown => JSON.parse(text.data), String)();
  if (decoded.isErr()) return null;
  const parsed = stateSchema.safeParse(decoded.value);
  return parsed.success ? parsed.data : null;
}

async function terrainPixels(page: Page) {
  const screenshot = await page.locator("canvas").screenshot();
  const decoded = Result.fromThrowable(() => PNG.sync.read(screenshot), String)();
  if (decoded.isErr()) return 0;
  let green = 0;
  const pixels = decoded.value.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i] ?? 0, channel = pixels[i + 1] ?? 0, blue = pixels[i + 2] ?? 0;
    if (channel > red * 1.2 && channel > blue * 1.2) green++;
  }
  return green;
}

test("general engine changes terrain density, imports real game assets and switches Lua controllers", async ({ page }) => {
  test.skip(process.env.PANGEA_SANDBOX_RUNTIME_TEST !== "1", "Build and stage the standalone engine prototype before enabling this test.");
  test.setTimeout(120_000);
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("generated/pangea-ports/wasm/sandbox/PangeaSandbox.html?script=ground.lua");
  await expect(page.getByLabel("Open asset")).toBeEnabled({ timeout: 60_000 });
  await expect.poll(async () => (await state(page))?.actors).toBe(1);
  await expect.poll(() => terrainPixels(page)).toBeGreaterThan(1000);
  const original = await state(page);
  expect(original?.chunks).toBe(4);
  await page.locator("canvas").focus();
  await page.keyboard.down("d");
  await expect.poll(async () => (await state(page))?.actorX).toBeGreaterThan(520);
  await page.keyboard.up("d");
  for (const density of [16, 32, 8]) {
    await page.getByLabel("Cells per chunk").selectOption(String(density));
    await expect.poll(async () => (await state(page))?.density).toBe(density);
    const current = await state(page);
    expect(current?.triangles).toBe(4 * density * density * 2);
    expect(current?.sampleHeight).toBe(original?.sampleHeight);
  }
  const assets = [
    { path: "public/games/nanosaur2/models/global.bg3d", models: 1 },
    { path: "public/games/bugdom1/models/Global_Models1.3dmf", models: 2 },
  ];
  for (const asset of assets) {
    await page.getByLabel("Open asset").setInputFiles(resolve(asset.path));
    await expect.poll(async () => (await state(page))?.models).toBe(asset.models);
    const groups = page.getByLabel("Model group");
    const values = await groups.locator("option").evaluateAll((options) => options.map((option) => option.getAttribute("value")));
    const last = z.string().safeParse(values.at(-1));
    expect(last.success).toBe(true);
    if (!last.success) return;
    await groups.selectOption(last.data);
    await expect.poll(async () => (await state(page))?.group).toBe(Number(last.data));
  }
  expect((await state(page))?.materials).toBeGreaterThan(17);
  await page.getByLabel("Open asset").setInputFiles(resolve("public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc"));
  await expect.poll(async () => (await state(page))?.resources).toBe(162);
  await expect(page.locator("#stats")).toContainText("162 resources");
  const beforeInvalid = await state(page);
  await page.getByLabel("Open asset").setInputFiles({ name: "broken.bg3d", mimeType: "application/octet-stream", buffer: Buffer.from("BG3D") });
  await expect(page.locator("#status")).toContainText("Invalid");
  expect((await state(page))?.models).toBe(beforeInvalid?.models);
  expect((await state(page))?.group).toBe(beforeInvalid?.group);
  await page.setViewportSize({ width: 900, height: 700 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("header label, footer > *")].every((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight;
  }))).toBe(true);
  await expect(page.locator("#stats")).toBeInViewport();
  await expect.poll(() => page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    return canvas ? Math.abs(canvas.width - canvas.getBoundingClientRect().width) : Infinity;
  })).toBeLessThan(2);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator("#stats")).toBeInViewport();
  await page.screenshot({ path: "/tmp/pangea-sandbox-browser.png" });
  await page.getByRole("combobox", { name: "Package", exact: true }).selectOption("orbit.lua");
  await expect(page.getByLabel("Open asset")).toBeEnabled({ timeout: 60_000 });
  await expect.poll(async () => (await state(page))?.chunks).toBe(6);
  await expect.poll(() => terrainPixels(page)).toBeGreaterThan(1000);
  expect((await state(page))?.actors).toBe(1);
  expect(failures).toEqual([]);
});
