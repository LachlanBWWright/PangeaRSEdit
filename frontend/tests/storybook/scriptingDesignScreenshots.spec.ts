import { expect, test } from "@playwright/test";

const screens = [
  { id: "scripting-game-model-library--named-skeleton", name: "applied-appearance", ready: "Current appearance" },
  { id: "scripting-game-model-library--candidate-chooser", name: "candidate-chooser", ready: "Candidate preview" },
  { id: "scripts-lua-source-workspace--production-layout", name: "lua-workspace", ready: "Lua source" },
  { id: "scripting-object-behavior-workspace--desktop-external-editor", name: "desktop-behavior", ready: "Open file externally" },
];
const viewports = [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 390, height: 844 }];

for (const viewport of viewports) {
  for (const screen of screens) {
    test(`${screen.name} ${viewport.name} visual baseline`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/iframe.html?id=${screen.id}&viewMode=story`);
      await expect(page.getByText(screen.ready, { exact: true }).first()).toBeVisible();
      await expect(page.locator(".sb-errordisplay")).toBeHidden();
      if (screen.name === "applied-appearance") await expect(page.getByRole("combobox", { name: "Initial animation", exact: true })).toHaveValue("1");
      if (screen.name === "lua-workspace") {
        await expect(page.getByRole("region", { name: "Lua API reference" })).toBeVisible();
        await expect(page.locator(".monaco-editor .view-lines")).toContainText(/local.*name/);
      }
      if (screen.name === "desktop-behavior") await expect(page.getByRole("spinbutton", { name: "Health" })).toHaveValue("30");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      const canvas = screen.name === "candidate-chooser" ? page.locator('[role="dialog"] canvas') : page.locator("canvas");
      await expect(page).toHaveScreenshot(`${screen.name}-${viewport.name}.png`, { animations: "disabled", caret: "hide", mask: [canvas], maskColor: "#0f1826", maxDiffPixelRatio: 0.005 });
    });
  }
}
