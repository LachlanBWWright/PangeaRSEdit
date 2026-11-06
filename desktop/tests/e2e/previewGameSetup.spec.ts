import * as fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "./desktopFixture.ts";
import { installDownloadFixture } from "./downloadFixture.ts";

test("missing preview game opens its download setup and preserves the open level", async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  const dataRoot = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data");
  await fs.mkdir(path.join(profile, "games"), { recursive: true });
  await fs.writeFile(path.join(profile, "games/assets.json"), JSON.stringify([{
    game: "OttoMatic", version: "original", root: path.dirname(dataRoot),
    source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
  }]));
  const restarted = await desktop.restart();
  expect(restarted).not.toBeNull();
  if (!restarted) return;
  const { page, application } = restarted;
  await installDownloadFixture(application);
  const card = page.locator("div.bg-gray-800").filter({ has: page.getByRole("heading", { name: "Otto Matic", exact: true }) }).first();
  await card.getByRole("button", { name: "Level 1", exact: true }).click();
  await expect(page.locator(".konvajs-content")).toBeVisible({ timeout: 30_000 });
  const dialog = page.getByRole("dialog", { name: "Game installations", exact: true });
  for (const action of [/^Preview in Game(?: \(no scripts\))?$/, /^Preview from Main Menu$/]) {
    await page.getByRole("button", { name: "Level Actions", exact: true }).click();
    await page.getByRole("menuitem", { name: action }).click();
    await expect(dialog.getByRole("heading", { name: "Set up game preview", exact: true })).toBeVisible();
    const game = dialog.getByRole("region", { name: "Otto Matic", exact: true });
    await expect(game.getByRole("button", { name: "Download and install", exact: true })).toBeEnabled();
    await expect(game.getByRole("button", { name: "Locate existing", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("region", { name: "Bugdom", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator(".konvajs-content")).toBeVisible();
  }
  await page.getByRole("button", { name: "Level Actions", exact: true }).click();
  await page.getByRole("menuitem", { name: /^Preview in Game(?: \(no scripts\))?$/ }).click();
  await dialog.getByRole("button", { name: "Download and install", exact: true }).click();
  await expect(dialog.getByText(/Installed: test-v1/)).toBeVisible();
});
