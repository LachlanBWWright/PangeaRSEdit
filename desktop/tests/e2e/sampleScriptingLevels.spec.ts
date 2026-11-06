import * as fs from "node:fs/promises";
import path from "node:path";
import { ResultAsync } from "neverthrow";
import { test, expect } from "./desktopFixture.ts";

for (const sample of ["Brain Alien spawner", "Scripted saucer deployments"]) {
test(`opens the Earth Farm ${sample} sample from installed Otto game data`, async ({ desktop }) => {
  const profile = await desktop.application.evaluate(({ app }) => app.getPath("userData"));
  const dataRoot = path.resolve("../games/pangea-ports/games/OttoMatic-Android/Data");
  const registry = path.join(profile, "games");
  const saved = await ResultAsync.fromPromise(fs.mkdir(registry, { recursive: true }).then(() => fs.writeFile(path.join(registry, "assets.json"), JSON.stringify([{
    game: "OttoMatic", version: "original", root: path.dirname(dataRoot), source: "upstream", dataRoot, releaseUrl: "https://example.com/original.zip",
  }]))), () => "Cannot prepare original game data");
  expect(saved.isOk()).toBe(true);
  const restarted = await desktop.restart();
  expect(restarted).not.toBeNull();
  if (!restarted) return;
  const { page } = restarted;
  await page.getByRole("button", { name: "Open settings" }).click();
  await page.getByRole("menuitemcheckbox", { name: /^Sample scripting levels/ }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: new RegExp(`Earth Farm — ${sample}`) }).click();
  await expect(page.locator(".konvajs-content")).toBeVisible({ timeout: 45_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  if (sample === "Scripted saucer deployments") {
    await page.getByRole("button", { name: "Level events", exact: true }).click();
    await expect(page.getByRole("button", { name: "Edit source", exact: true })).toHaveCount(4);
    await page.getByRole("button", { name: "Edit source", exact: true }).first().click();
    await expect(page.getByText("Level script: assigned in 1 level(s). Manage callbacks in Level events.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Lua source preview")).toContainText('require("helpers.landing-search")');
    return;
  }
  await page.getByRole("button", { name: "Objects", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Object name", exact: true })).toHaveValue("Brain Port");
  await expect(page.getByRole("spinbutton", { name: "Model scale", exact: true })).toHaveValue("3.5");
  await page.getByRole("button", { name: "Behavior", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Total aliens", exact: true })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Port health", exact: true })).toHaveValue("2");
  await expect(page.getByLabel("Lua source preview")).toContainText("ottomatic.brainAlien");
});
}
