import * as fs from "node:fs/promises";
import path from "node:path";
import { ResultAsync } from "neverthrow";
import { test, expect } from "./desktopFixture.ts";
import { installDownloadFixture } from "./downloadFixture.ts";

test("missing assets offer Jorio data directly while an empty runtime catalog keeps local games available", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => { globalThis.fetch = async () => Response.json([]); });
  await expect(page.getByText("Stock levels are an optional download.").first()).toBeVisible();
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Download original data", exact: true }).first()).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Download editor assets", exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("combobox", { name: /data source/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("No complete compatible releases have been published yet. You can locate an existing compatible build.");
  await expect(dialog.getByRole("button", { name: "Download and install", exact: true }).first()).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Locate existing", exact: true }).first()).toBeEnabled();
});

test("offline runtime discovery keeps original data downloads and Locate existing available", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => { globalThis.fetch = () => Promise.reject(new Error("Offline fixture")); });
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Installed games remain available offline");
  await expect(dialog.getByRole("button", { name: "Locate existing", exact: true }).first()).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Download original data", exact: true }).first()).toBeEnabled();
});

test("compatible runtime download verifies, extracts, registers, and removes an installation", async ({ desktop }) => {
  test.skip(process.platform === "win32", "The controlled executable fixture uses the POSIX compatibility protocol.");
  const { application, page } = desktop;
  await installDownloadFixture(application);
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "Game release" })).toHaveValue("test-v1");
  const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
  await card.getByRole("button", { name: "Download and install", exact: true }).click();
  await expect(card.getByText(/Installed: test-v1/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Remove", exact: true })).toBeEnabled();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
  await card.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(card.getByText(/Not installed/)).toBeVisible();
});

test("a pending runtime download can be cancelled and the controls become usable again", async ({ desktop }) => {
  const { application, page } = desktop;
  await installDownloadFixture(application, true);
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
  await card.getByRole("button", { name: "Download and install", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Preparing installation…");
  await card.getByRole("button", { name: "Cancel download", exact: true }).click();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
  await expect(card.getByRole("button", { name: "Download and install", exact: true })).toBeEnabled();
  await expect(card.getByText(/Not installed/)).toBeVisible();
});

test("a corrupt runtime package remains uninstalled and can be retried", async ({ desktop }) => {
  const { application, page } = desktop;
  await installDownloadFixture(application, false, true);
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
  await card.getByRole("button", { name: "Download and install", exact: true }).click();
  await expect(page.getByText("Downloaded game failed checksum verification", { exact: true })).toBeVisible();
  await expect(card.getByText(/Not installed/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Download and install", exact: true })).toBeEnabled();
  await installDownloadFixture(application, true);
  await card.getByRole("button", { name: "Download and install", exact: true }).click();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).toBeVisible();
  await card.getByRole("button", { name: "Cancel download", exact: true }).click();
  await expect(card.getByRole("button", { name: "Download and install", exact: true })).toBeEnabled();
});

test("Locate existing retains a local compatible game and Forget leaves its files intact", async ({ desktop }) => {
  test.skip(process.platform === "win32", "The controlled executable fixture uses the POSIX compatibility protocol.");
  const { application, page, folder } = desktop;
  const localGame = path.join(folder, "local-game");
  const made = await ResultAsync.fromPromise(fs.mkdir(path.join(localGame, "Data/System"), { recursive: true }), () => "Cannot create local game fixture");
  expect(made.isOk()).toBe(true);
  const executable = path.join(localGame, "OttoMatic");
  const written = await ResultAsync.fromPromise(fs.writeFile(executable, "#!/bin/sh\nprintf '2\\n'\n", { mode: 0o755 }), () => "Cannot create compatibility fixture");
  expect(written.isOk()).toBe(true);
  await application.evaluate(({ dialog }, selected) => {
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [selected] });
  }, localGame);
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const card = page.getByRole("dialog", { name: "Game installations" }).getByRole("region", { name: "Otto Matic", exact: true });
  await card.getByRole("button", { name: "Locate existing", exact: true }).click();
  await expect(card.getByText(/Installed: .*\(external\)/)).toBeVisible();
  await card.getByRole("button", { name: "Forget", exact: true }).click();
  await expect(card.getByText(/Not installed/)).toBeVisible();
  const retained = await ResultAsync.fromPromise(fs.readFile(executable, "utf8"), () => "Local game was removed");
  expect(retained.isOk() && retained.value).toContain("printf '2");
});
