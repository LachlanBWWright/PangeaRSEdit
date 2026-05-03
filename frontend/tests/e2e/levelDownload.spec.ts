import { test, expect, type Locator, type Page } from "@playwright/test";

async function gotoCustomLevels(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Custom Levels" }).click();
  await expect(
    page.getByRole("heading", { name: "Custom Levels", exact: true }),
  ).toBeVisible();
}

function cardByHeading(page: Page, heading: string): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({ has: page.getByRole("heading", { name: heading, exact: true }) })
    .first();
}

test.describe("Custom Levels", () => {
  test.beforeEach(async ({ page }) => {
    await gotoCustomLevels(page);
  });

  test("shows the custom levels page through navbar navigation", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Play Games", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Download Custom Levels",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Otto Matic", exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Level 1 Hard", exact: true }),
    ).toBeVisible();
  });

  test("expands the Otto custom level details", async ({ page }) => {
    const levelCard = cardByHeading(page, "Level 1 Hard");

    await levelCard
      .getByRole("button", { name: "Details", exact: true })
      .click();

    await expect(
      levelCard.getByText("Farms have tractors, right?"),
    ).toBeVisible();
  });

  test("downloads the Otto custom level archive", async ({ page }) => {
    const levelCard = cardByHeading(page, "Level 1 Hard");

    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    await levelCard
      .getByRole("button", { name: "Download", exact: true })
      .click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".zip");
  });

  test("opens the Otto custom preview dialog and enters launched state", async ({
    page,
  }) => {
    const levelCard = cardByHeading(page, "Level 1 Hard");

    await levelCard
      .getByRole("button", { name: "Play Level in Browser", exact: true })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/^Level:$/)).toBeVisible();
    await expect(
      dialog.getByRole("heading", {
        name: /Preview in Otto Matic.*Lv 1: Earth Farm/i,
      }),
    ).toBeVisible();

    await dialog
      .getByRole("button", { name: "Launch Game", exact: true })
      .click();

    await expect(
      dialog.getByRole("button", { name: "Reload Game", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Fullscreen", exact: true }),
    ).toBeVisible();

    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test("opens the Otto normal-launch dialog and enters launched state", async ({
    page,
  }) => {
    const gameCard = cardByHeading(page, "Otto Matic");

    await gameCard
      .getByRole("button", { name: "Play in Browser", exact: true })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Play Otto Matic", exact: true }),
    ).toBeVisible();
    await expect(dialog.getByText(/^Level:$/)).toHaveCount(0);

    await dialog
      .getByRole("button", { name: "Launch Game", exact: true })
      .click();

    await expect(
      dialog.getByRole("button", { name: "Reload Game", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Fullscreen", exact: true }),
    ).toBeVisible();
  });
});
