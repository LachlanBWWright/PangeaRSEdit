import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runScriptPackageRoundTrip } from "./scriptPackageRoundTrip";
import { runScriptObjectAuthoringRoundTrip } from "./scriptObjectAuthoringRoundTrip";
import { runScriptRuntimeTraceback } from "./scriptRuntimeTraceback";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const levelPath = path.resolve(
  __dirname,
  "../../public/assets/croMag/terrain/IronAge_Europe.ter.rsrc",
);
const texturePath = path.resolve(
  __dirname,
  "../../public/assets/croMag/terrain/IronAge_Europe.ter",
);

function croMagCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Cro-Mag Rally", exact: true }),
    })
    .first();
}

test("exports, reopens, and recompiles a Cro-Mag Rally script package", async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cro-Mag Rally", exact: true })).toBeVisible({ timeout: 30_000 });
  await runScriptPackageRoundTrip(page, croMagCard(page), [levelPath, texturePath]);
});

test("creates, places, edits, and reopens a Cro-Mag Rally scripted object", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cro-Mag Rally", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptObjectAuthoringRoundTrip(page, croMagCard(page), [levelPath, texturePath], "Cro-Mag Test Object");
});

test("uses the production Cro-Mag Rally Scripts workspace through preview launch", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "pangea-feature-flags",
      JSON.stringify({
        scripting: true,
        multiplayer: false,
        itemModelMappingPreview: false,
      }),
    );
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Cro-Mag Rally", exact: true }),
  ).toBeVisible({ timeout: 30_000 });

  await croMagCard(page)
    .locator('input[type="file"]')
    .setInputFiles([levelPath, texturePath]);
  await expect(
    page.locator("summary").filter({ hasText: "Level Actions" }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click();
  await page.getByRole("button", { name: "Open Scripts", exact: true }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
  await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
  await dialog
    .getByRole("tab", { name: "Preview and Export", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Compile Bundle", exact: true }).click();
  await expect(page.getByText("Script bundle compiled")).toBeVisible({
    timeout: 30_000,
  });
  await dialog.getByRole("button", { name: "Preview with Scripts", exact: true }).click();

  const previewDialog = page.getByRole("dialog").last();
  await expect(
    previewDialog.getByRole("heading", { name: /Preview in Cro-Mag Rally/i }),
  ).toBeVisible({ timeout: 30_000 });
  await previewDialog.getByRole("button", { name: "Launch Game", exact: true }).click();
  await expect(
    previewDialog.getByRole("button", { name: "Reload Game", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("Host Status:", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
  await previewDialog.getByRole("button", { name: "Reload Game", exact: true }).click();
  await expect(previewDialog.getByText("ACTIVE", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(previewDialog.getByText("LOADED", { exact: true })).toHaveCount(2);
});

test("surfaces a production Lua runtime traceback in the Cro-Mag Rally preview monitor", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    window.localStorage.setItem("pangea-feature-flags", JSON.stringify({
      scripting: true,
      multiplayer: false,
      itemModelMappingPreview: false,
    }));
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cro-Mag Rally", exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await runScriptRuntimeTraceback(
    page,
    croMagCard(page),
    [levelPath, texturePath],
    "cro-mag rally production traceback regression",
    "onRaceStart",
  );
});
