import * as fs from "node:fs/promises";
import path from "node:path";
import { Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { assetInstallationSchema } from "@pangea/desktop-contracts";
import type { ElectronApplication } from "@playwright/test";
import { test, expect } from "./desktopFixture.ts";

async function expectNoRegisteredData(application: ElectronApplication) {
  const profile = await application.evaluate(({ app }) => app.getPath("userData"));
  const registry = await ResultAsync.fromPromise(fs.readFile(path.join(profile, "games/assets.json"), "utf8"), (cause: unknown) => cause);
  if (registry.isErr()) {
    const missing = z.object({ code: z.literal("ENOENT") }).safeParse(registry.error);
    expect(missing.success).toBe(true);
    return;
  }
  const parsed = Result.fromThrowable((): unknown => JSON.parse(registry.value), () => "Invalid registry")();
  expect(parsed.isOk()).toBe(true);
  if (parsed.isErr()) return;
  const entries = z.array(assetInstallationSchema).safeParse(parsed.value);
  expect(entries.success && entries.data).toEqual([]);
}

for (const offline of [false, true]) {
  test(`Jorio stock-data downloads remain available with ${offline ? "offline" : "empty"} runtime releases`, async ({ desktop }) => {
    const { application, page } = desktop;
    await application.evaluate((_electron, unavailable) => {
      globalThis.fetch = () => unavailable ? Promise.reject(new Error("Offline fixture")) : Promise.resolve(Response.json([]));
    }, offline);
    await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Game installations" });
    await dialog.getByRole("button", { name: "Check releases", exact: true }).click();
    await expect(dialog.getByRole("status")).toContainText(offline ? "Installed games remain available offline" : "No complete compatible releases have been published yet");
    const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
    await expect(card.getByRole("combobox", { name: "Otto Matic data source", exact: true })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Download editor assets", exact: true })).toHaveCount(0);
    await expect(card.getByText("Pinned version 4.0.1", { exact: false })).toBeVisible();
    await expect(card.getByRole("link", { name: "Jorio release and attribution", exact: true })).toHaveAttribute("href", "https://github.com/Jorio/OttoMatic/releases/tag/4.0.1");
    await expect(card.getByRole("button", { name: "Download original data", exact: true })).toBeEnabled();
    await expect(card.getByRole("button", { name: "Download and install", exact: true })).toBeDisabled();
    await expect(card.getByText(/Download stock levels and native game data from Jorio/)).toBeVisible();
    await expectNoRegisteredData(application);
  });
}

test("a pending original-data download cancels through IPC and can be retried without registration", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => {
    globalThis.fetch = async (_url, options) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new Error("Download cancelled")), { once: true });
    });
  });
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
  for (const attempt of [1, 2]) {
    await test.step(`Cancel attempt ${String(attempt)}`, async () => {
      await card.getByRole("button", { name: "Download original data", exact: true }).click();
      await expect(card.getByRole("status")).toHaveText("Preparing installation…");
      await expect(card.getByRole("button", { name: "Download original data", exact: true })).toBeDisabled();
      await card.getByRole("button", { name: "Cancel download", exact: true }).click();
      await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
      await expect(card.getByRole("button", { name: "Download original data", exact: true })).toBeEnabled();
    });
  }
  await expect(card.getByText("Stock data: not installed", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Remove stock data", exact: true })).not.toBeVisible();
  await expect(dialog.getByRole("alert")).not.toBeVisible();
  await expectNoRegisteredData(application);
});

test("a truncated original distribution fails pinned verification and leaves retry available", async ({ desktop }) => {
  const { application, page } = desktop;
  await application.evaluate(() => { globalThis.fetch = async () => new Response(new Uint8Array([0])); });
  await page.getByRole("button", { name: "Get game data", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Game installations" });
  const card = dialog.getByRole("region", { name: "Otto Matic", exact: true });
  await card.getByRole("button", { name: "Download original data", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Upstream download failed pinned SHA-256 verification");
  await expect(card.getByText("Stock data: not installed", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Download original data", exact: true })).toBeEnabled();
  await expect(card.getByRole("button", { name: "Cancel download", exact: true })).not.toBeVisible();
  await expect(card.getByRole("button", { name: "Remove stock data", exact: true })).not.toBeVisible();
  await expectNoRegisteredData(application);
});
