import { test, expect } from "./desktopFixture.ts";

test("Lua engine launches and stops the native runtime from its editor controls", async ({ desktop }) => {
  test.skip(process.env.PANGEA_SANDBOX_NATIVE_TEST !== "1", "Build the native engine before this acceptance test.");
  const { page } = desktop;
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Lua Engine level editor/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Lua Engine", exact: true }).click();
  await page.getByRole("button", { name: "Run native game", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Native preview is running.");
  await page.getByRole("button", { name: "Stop native game", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Native preview is stopped.");
});
