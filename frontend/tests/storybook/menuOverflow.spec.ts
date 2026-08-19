import { expect, test, type Locator } from "@playwright/test";

const MENU_SELECTOR = "[data-editor-menu-surface] > div";
const EDITOR_MENUS = [
  {
    game: "Otto Matic",
    story: "otto-matic",
    tabs: ["Fences", "Water", "Items", "Splines", "Scripts", "Tiles", "Supertiles"],
  },
  {
    game: "Bugdom",
    story: "bugdom",
    tabs: [
      "Fences",
      "Items",
      "Splines",
      "Scripts",
      "Terrain",
      "Visual Tiles",
      "Vertex Colors",
    ],
  },
  {
    game: "Bugdom 2",
    story: "bugdom-2",
    tabs: ["Fences", "Water", "Items", "Splines", "Scripts", "Tiles", "Supertiles"],
  },
  {
    game: "Nanosaur",
    story: "nanosaur",
    tabs: ["Items", "Scripts", "Terrain", "Visual Tiles", "Collision & Paths"],
  },
  {
    game: "Nanosaur 2",
    story: "nanosaur-2",
    tabs: ["Fences", "Water", "Items", "Splines", "Scripts", "Tiles", "Supertiles"],
  },
  {
    game: "Cro-Mag Rally",
    story: "cro-mag-rally",
    tabs: ["Fences", "Water", "Items", "Splines", "Scripts", "Tiles", "Supertiles"],
  },
  {
    game: "Billy Frontier",
    story: "billy-frontier",
    tabs: ["Fences", "Water", "Items", "Splines", "Scripts", "Tiles", "Supertiles"],
  },
  {
    game: "Mighty Mike",
    story: "mighty-mike",
    tabs: ["Items", "Scripts", "Visual Tiles", "Behavior Tiles", "Animations"],
  },
] as const;
const EDITOR_WIDTHS = [320, 640, 1024] as const;

async function expectNoHorizontalOverflow(
  locator: Locator,
  context: string,
): Promise<void> {
  const violations = await locator.locator("*").evaluateAll((elements) =>
    elements.flatMap((element) => {
      const overflowX = window.getComputedStyle(element).overflowX;
      if (
        overflowX !== "visible" ||
        element.scrollWidth <= element.clientWidth + 1
      ) {
        return [];
      }
      return [{
        className: element.getAttribute("class") ?? "",
        clientWidth: element.clientWidth,
        label:
          element.getAttribute("data-editor-menu-column") ??
          element.getAttribute("role") ??
          "menu",
        scrollWidth: element.scrollWidth,
        tagName: element.tagName.toLowerCase(),
      }];
    }),
  );

  expect(violations, context).toEqual([]);
}

test("level-editor menus and their columns do not overflow horizontally", async ({
  page,
}) => {
  for (const width of EDITOR_WIDTHS) {
    for (const menu of EDITOR_MENUS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=level-editor-menu-layouts--${menu.story}&viewMode=story`,
      );
      const gameMenu = page.locator(`[data-editor-game="${menu.game}"]`);
      await expect(gameMenu).toHaveCount(1);
      const toolbar = gameMenu.locator("[data-editor-menu-toolbar]");
      await expect(toolbar.getByRole("tab")).toHaveCount(menu.tabs.length);
      for (const tab of menu.tabs) {
        await toolbar.getByRole("tab", { name: tab, exact: true }).click();
        await expect(gameMenu).toHaveAttribute("data-editor-tab", tab);
        const context = `${menu.game} / ${tab} / ${String(width)}px`;
        await expectNoHorizontalOverflow(gameMenu.locator(MENU_SELECTOR), context);
        await expectNoHorizontalOverflow(
          gameMenu.locator("[data-editor-menu-surface]"),
          context,
        );
      }
      await expectNoHorizontalOverflow(
        page.locator(MENU_SELECTOR),
        `${menu.game} / ${String(width)}px`,
      );
    }
  }
});

test("vertical overflow remains contained by the menu scroller", async ({ page }) => {
  for (const width of EDITOR_WIDTHS) {
    for (const menu of EDITOR_MENUS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(
        `/iframe.html?id=level-editor-menu-layouts--${menu.story}&viewMode=story`,
      );
      const menus = page.locator(MENU_SELECTOR);
      await expect(menus).toHaveCount(1);
      await expect(menus).toHaveCSS("overflow-y", "auto");
      await expect(menus).toHaveCSS("height", "320px");
    }
  }
});
