import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 1000 } });

const steps = ["create-object", "appearance", "behavior", "placement", "test-and-export"];
for (const [index, step] of steps.entries()) {
  test(`captures Brain Port ${step}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=workflows-brain-port--${step}&viewMode=story`);
    await expect(page.locator("#storybook-root main")).toBeVisible();
    await expect(page.locator(".sb-errordisplay")).toBeHidden();
    if (step !== "placement") {
      const editorBackground = await page.locator("#storybook-root main").evaluate((element) => getComputedStyle(element).backgroundColor);
      await expect.poll(() => page.locator(".scripting-workspace").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(editorBackground);
    }
    if (step === "create-object") await expect(page.getByRole("dialog").getByLabel("Object name")).toHaveValue("Brain Port");
    if (step === "appearance") {
      await expect(page.getByLabel("Model object ID")).toBeVisible();
      await page.getByLabel("Model object ID").scrollIntoViewIfNeeded();
    }
    if (step === "behavior") {
      await expect(page.locator(".monaco-editor")).toBeVisible();
      await page.locator(".monaco-editor").scrollIntoViewIfNeeded();
    }
    if (step === "test-and-export") await expect(page.getByRole("button", { name: "Export extended level", exact: true })).toBeVisible();
    if (step === "placement") {
      await expect(page.locator("#scripted-item-z")).toHaveValue("2150");
      const canvas = page.locator(".konvajs-content");
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;
      for (let pan = 0; pan < 4; pan++) {
        await page.mouse.move(box.x + box.width - 100, box.y + box.height - 30);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 100, box.y + 30, { steps: 15 });
        await page.mouse.up();
      }
    }
    await expect(page.getByRole("alert").filter({ hasText: /Could not load|Story failed|Error fetching/ })).toHaveCount(0);
    await page.screenshot({ path: path.resolve(`screenshots/storybook/brain-port-${index + 1}-${step}.png`), fullPage: true, animations: "disabled" });
  });
}
