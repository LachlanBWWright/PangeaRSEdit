import * as fs from "node:fs/promises";
import path from "node:path";
import { ResultAsync } from "neverthrow";
import { test, expect } from "./desktopFixture.ts";

const samples = [
  { game: "Bugdom", port: "Bugdom-android", title: "Training — Ant alarm", hooks: 5, source: "bugdom-alarm" },
  { game: "Bugdom2", port: "Bugdom2-Android", title: "Garden — Platform checkpoint course", hooks: 5, source: "bugdom2-course" },
  { game: "Nanosaur", port: "Nanosaur-android", title: "Valley — Nest defence", hooks: 4, source: "nanosaur-nest" },
  { game: "Nanosaur2", port: "Nanosaur2-Android", title: "Forest — Aerial interception", hooks: 4, source: "nanosaur2-interception" },
  { game: "CroMagRally", port: "CroMagRally-Android", title: "Desert — Branching bonus gates", hooks: 3, source: "cromag-gates" },
  { game: "BillyFrontier", port: "BillyFrontier-Android", title: "Swamp Shootout — Reactive gallery", hooks: 4, source: "billy-gallery" },
  { game: "MightyMike", port: "MightyMike-Android", title: "Prehistoric Plaza — Factory lockdown", hooks: 4, source: "mike-lockdown" },
];

for (const sample of samples) {
  test(`opens ${sample.game} sample using installed native data and editable level events`, async ({ desktop }) => {
    const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
    const dataRoot = path.resolve(`../games/pangea-ports/games/${sample.port}/Data`);
    const registry = path.join(profile, "games");
    const saved = await ResultAsync.fromPromise(fs.mkdir(registry, { recursive: true }).then(() => fs.writeFile(path.join(registry, "assets.json"), JSON.stringify([{
      game: sample.game, version: "original", root: path.dirname(dataRoot), source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
    }]))), () => "Cannot prepare native game data");
    expect(saved.isOk()).toBe(true);
    const restarted = await desktop.restart();
    expect(restarted).not.toBeNull();
    if (!restarted) return;
    const { page } = restarted;
    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByRole("menuitemcheckbox", { name: /^Sample scripting levels/ }).click();
    await page.keyboard.press("Escape");
    const button = page.getByRole("button", { name: new RegExp(sample.title) });
    await button.scrollIntoViewIfNeeded();
    await button.click();
    await expect(page.locator(".konvajs-content").first()).toBeVisible({ timeout: 45_000 });
    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    await page.getByRole("button", { name: "Level events", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit source", exact: true })).toHaveCount(sample.hooks);
    await page.getByRole("button", { name: "Edit source", exact: true }).first().click();
    await expect(page.getByLabel("Lua source preview")).toContainText(`helpers.create("${sample.source}"`);
    await expect(page.getByText("Level script: assigned in 1 level(s). Manage callbacks in Level events.", { exact: true })).toBeVisible();
  });
}
