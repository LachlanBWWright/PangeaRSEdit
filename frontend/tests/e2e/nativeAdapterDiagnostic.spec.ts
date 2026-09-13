import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface NativeAdapterCase {
  readonly title: string;
  readonly levelFiles: readonly string[];
  readonly runtimeUrlPattern: string;
}

const asset = (relativePath: string): string =>
  path.resolve(__dirname, `../../public/assets/${relativePath}`);

const nativeAdapterCases: readonly NativeAdapterCase[] = [
  {
    title: "Otto Matic",
    levelFiles: [
      asset("ottoMatic/terrain/EarthFarm.ter.rsrc"),
      asset("ottoMatic/terrain/EarthFarm.ter"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/ottomatic/OttoMatic.js*",
  },
  {
    title: "Nanosaur",
    levelFiles: [
      asset("nanosaur/terrain/Level1.ter"),
      asset("nanosaur/terrain/Level1.trt"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/nanosaur/Nanosaur.js*",
  },
  {
    title: "Bugdom",
    levelFiles: [asset("bugdom/terrain/Training.ter.rsrc")],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/bugdom/Bugdom.js*",
  },
  {
    title: "Bugdom 2",
    levelFiles: [
      asset("bugdom2/terrain/Level3_DogHair.ter.rsrc"),
      asset("bugdom2/terrain/Level3_DogHair.ter"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/bugdom2/Bugdom2.js*",
  },
  {
    title: "Cro-Mag Rally",
    levelFiles: [
      asset("croMag/terrain/IronAge_Europe.ter.rsrc"),
      asset("croMag/terrain/IronAge_Europe.ter"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/cromagrally/CroMagRally.js*",
  },
  {
    title: "Billy Frontier",
    levelFiles: [
      asset("billyFrontier/terrain/town_duel.ter.rsrc"),
      asset("billyFrontier/terrain/town_duel.ter"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/billyfrontier/billyfrontier.js*",
  },
  {
    title: "Mighty Mike",
    levelFiles: [
      asset("mightyMike/terrain/candy.map-1"),
      asset("mightyMike/terrain/candy.tileset"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/mightymike/MightyMike.js*",
  },
  {
    title: "Nanosaur 2",
    levelFiles: [
      asset("nanosaur2/terrain/level1.ter.rsrc"),
      asset("nanosaur2/terrain/level1.ter"),
    ],
    runtimeUrlPattern: "**/generated/pangea-ports/wasm/nanosaur2/Nanosaur2.js*",
  },
];

function gameCard(page: Page, title: string): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .first();
}

for (const adapterCase of nativeAdapterCases) {
  test(`surfaces a ${adapterCase.title} native-adapter runtime failure`, async ({
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
      page.getByRole("heading", { name: adapterCase.title, exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await gameCard(page, adapterCase.title)
      .locator('input[type="file"]')
      .setInputFiles([...adapterCase.levelFiles]);
    await expect(
      page.locator("summary").filter({ hasText: "Level Actions" }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole("tab", { name: "Scripts", exact: true }).click();
    await page.getByRole("button", { name: "Open Scripts", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
    await dialog.getByRole("button", { name: "Load", exact: true }).first().click();
    await dialog
      .getByRole("tab", { name: "Preview and Export", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Compile Bundle", exact: true })
      .click();
    await expect(
      page.getByText("Script bundle compiled", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await dialog
      .getByRole("button", { name: "Preview with Scripts", exact: true })
      .click();
    await page.route(adapterCase.runtimeUrlPattern, (route) =>
      route.abort("failed"),
    );
    const previewDialog = page.getByRole("dialog").last();
    await previewDialog
      .getByRole("button", { name: "Launch Game", exact: true })
      .click();
    await expect(
      previewDialog.getByText("Last Error:", { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      previewDialog.locator("pre").filter({ hasText: "Failed to load" }),
    ).toBeVisible({ timeout: 30_000 });
  });
}
