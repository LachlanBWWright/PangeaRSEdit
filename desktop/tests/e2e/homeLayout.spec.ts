import { test, expect } from "./desktopFixture.ts";

test("level selection fits the window and keeps carousel navigation available", async ({ desktop }) => {
  for (const width of [1440, 900]) {
    await desktop.application.evaluate(({ BrowserWindow }, size) => {
      BrowserWindow.getAllWindows()[0]?.setSize(size, 960);
    }, width);
    const carousel = desktop.page.getByRole("region", { name: "" }).filter({
      has: desktop.page.getByRole("button", { name: "Next slide", exact: true }),
    });
    await expect(carousel).toBeVisible();
    await expect.poll(() => carousel.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.left >= 0 && bounds.right <= window.innerWidth;
    })).toBe(true);
    await expect(desktop.page.getByRole("button", { name: "Next slide", exact: true })).toBeInViewport();
    await expect.poll(() => desktop.page.locator("fieldset").evaluate((element) => {
      const container = element.parentElement?.parentElement;
      return container ? container.scrollWidth - container.clientWidth : -1;
    })).toBe(0);
  }
});
