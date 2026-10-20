import { test, expect } from "./desktopFixture.ts";
import { installDownloadFixture } from "./downloadFixture.ts";

test("missing assets open the real download dialog and an empty catalog explains unavailable downloads", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => { globalThis.fetch = async () => Response.json([]); });
  await expect(page.getByText("Stock levels and previews are an optional download.").first()).toBeVisible();
  await page.getByRole("button", { name: "Get editor assets", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Download editor assets", exact: true }).first()).toBeDisabled();
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("No complete compatible releases have been published yet. You can locate an existing compatible build.");
  await expect(dialog.getByRole("button", { name: "Download and install", exact: true }).first()).toBeDisabled();
});

test("offline release discovery gives an actionable error and keeps Locate existing available", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => { globalThis.fetch = () => Promise.reject(new Error("Offline fixture")); });
  await page.getByRole("button", { name: "Get editor assets", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Installed games remain available offline");
  await expect(dialog.getByRole("button", { name: "Locate existing", exact: true }).first()).toBeEnabled();
});

test("editor asset download passes through real IPC, checksum verification, extraction, and registration", async ({ desktop }) => {
  const { application, page } = desktop;
  await installDownloadFixture(application);
  await page.getByRole("button", { name: "Get editor assets", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "Game release" })).toHaveValue("test-v1");
  const card = dialog.locator("section").filter({ has: page.getByRole("heading", { name: "Otto Matic", exact: true }) });
  await card.getByRole("button", { name: "Download editor assets", exact: true }).click();
  await expect(card.getByText(/Editor assets: test-v1/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Remove editor assets", exact: true })).toBeEnabled();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
  await card.getByRole("button", { name: "Remove editor assets", exact: true }).click();
  await expect(card.getByText(/Editor assets: not installed/)).toBeVisible();
});

test("a pending download can be cancelled and the controls become usable again", async ({ desktop }) => {
  const { application, page } = desktop;
  await installDownloadFixture(application, true);
  await page.getByRole("button", { name: "Get editor assets", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
  const card = dialog.locator("section").filter({ has: page.getByRole("heading", { name: "Otto Matic", exact: true }) });
  await card.getByRole("button", { name: "Download editor assets", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Preparing installation…");
  await card.getByRole("button", { name: "Cancel download", exact: true }).click();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
  await expect(card.getByRole("button", { name: "Download editor assets", exact: true })).toBeEnabled();
  await expect(card.getByText(/Editor assets: not installed/)).toBeVisible();
});
