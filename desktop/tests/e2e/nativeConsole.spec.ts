import * as fs from "node:fs/promises";
import path from "node:path";
import { test, expect } from "./desktopFixture.ts";

test("native console streams output and controls the most recent game process", async ({ desktop }) => {
  const { page, application, folder } = desktop;
  const script = path.join(folder, "fake-game.cjs");
  await fs.writeFile(script, 'process.stdout.write("Native process is running\\n"); process.stderr.write("Data/Scripts/dist/modules/helper.lua:12: simulated error\\n"); setInterval(() => {}, 1000); setTimeout(() => process.exit(0), 30000);');
  const profile = await application.evaluate(({ app }, preload) => {
    process.env.NODE_OPTIONS = `--require ${JSON.stringify(preload)}`;
    return app.getPath("userData");
  }, script);
  await fs.mkdir(path.join(profile, "games"), { recursive: true });
  await fs.writeFile(path.join(profile, "games/installed.json"), JSON.stringify([{ game: "OttoMatic", managed: false,
    version: "fixture", executable: process.execPath, data: folder, assetRootVersion: 2 }]));
  await page.evaluate(() => window.pangeaDesktop?.request({ operation: "games.installed" }));
  const started = await page.evaluate(() => window.pangeaDesktop?.request({ operation: "games.play", game: "OttoMatic" }));
  expect(started).toMatchObject({ ok: true });
  const consoleDialog = page.getByRole("dialog", { name: "Native game console", exact: true });
  await expect(consoleDialog).toBeVisible();
  await expect(consoleDialog.getByLabel("Native game output")).toContainText("Native process is running");
  await expect(consoleDialog.getByLabel("Native game output")).toContainText("simulated error");
  await consoleDialog.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(consoleDialog.getByRole("status")).toContainText("exited");
  await consoleDialog.getByRole("button", { name: "Restart snapshot", exact: true }).click();
  await expect(consoleDialog.getByRole("status")).toContainText("running");
  await expect(consoleDialog.getByRole("combobox", { name: "Game run", exact: true }).getByRole("option")).toHaveCount(2);
  await consoleDialog.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(consoleDialog.getByRole("status")).toContainText("exited");
});
