import { expect, test } from "@playwright/test";

test("Billy Frontier controls wait for WASM initialization", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let release: (() => void) | undefined;
  const initialization = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/billyfrontier.wasm", async (route) => {
    await initialization;
    await route.continue();
  });
  await page.goto("generated/pangea-ports/wasm/billyfrontier/billyfrontier.html?level=0", { waitUntil: "domcontentloaded" });
  const control = page.getByRole("checkbox", { name: "Fence Collision" });
  await expect(control).toBeDisabled();
  await page.waitForTimeout(1200);
  expect(errors).toEqual([]);
  release?.();
  await expect(control).toBeEnabled({ timeout: 30000 });
  expect(errors).toEqual([]);
});
