import { expect, test, type Locator } from "@playwright/test";

const RESPONSIVE_GALLERY_URL =
  "/iframe.html?id=level-editor-menu-layouts--responsive-gallery&viewMode=story";
const MENU_SELECTOR = "[data-storybook-editor-menu] > div";

async function expectNoHorizontalOverflow(locator: Locator): Promise<void> {
  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const element = locator.nth(index);
    const label = (await element.getAttribute("data-editor-menu-column")) ?? "menu";
    const dimensions = await element.evaluate((node) => ({
      clientWidth: node.clientWidth,
      scrollWidth: node.scrollWidth,
    }));

    expect(
      dimensions.scrollWidth,
      `${label} should fit within its available width`,
    ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  }
}

test("level-editor menus and their columns do not overflow horizontally", async ({
  page,
}) => {
  await page.goto(RESPONSIVE_GALLERY_URL);
  await expect(page.locator(MENU_SELECTOR)).toHaveCount(24);

  await expectNoHorizontalOverflow(page.locator(MENU_SELECTOR));
  await expectNoHorizontalOverflow(page.locator("[data-editor-menu-column]"));
});

test("vertical overflow remains contained by the menu scroller", async ({ page }) => {
  await page.goto(RESPONSIVE_GALLERY_URL);

  const menus = page.locator(MENU_SELECTOR);
  await expect(menus).toHaveCount(24);
  const count = await menus.count();
  for (let index = 0; index < count; index += 1) {
    const menu = menus.nth(index);
    await expect(menu).toHaveCSS("overflow-y", "auto");
    await expect(menu).toHaveCSS("height", "320px");
  }
});
