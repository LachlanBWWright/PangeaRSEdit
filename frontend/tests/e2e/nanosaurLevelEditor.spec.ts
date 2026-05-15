import {
  test,
  expect,
  type Locator,
  type Download,
  type Page,
} from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nanosaurLevelPath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur/terrain/Level1.ter",
);
const nanosaurTexturePath = path.resolve(
  __dirname,
  "../../public/assets/nanosaur/terrain/Level1.trt",
);

function nanosaurCard(page: Page): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: "Nanosaur", exact: true }),
    })
    .first();
}

function levelActionsSummary(page: Page): Locator {
  return page.locator("summary").filter({
    hasText: "Level Actions",
  });
}

async function uploadNanosaurLevelFiles(page: Page): Promise<void> {
  const card = nanosaurCard(page);
  const input = card.locator('input[type="file"]');
  await input.setInputFiles([nanosaurLevelPath, nanosaurTexturePath]);
}

test.describe("Nanosaur level editor", () => {
  test("parses uploaded nanosaur level and enables editor actions", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);

    await expect(levelActionsSummary(page)).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByText("Failed to parse level data")).toHaveCount(0);
    await expect(page.getByText("Failed to load textures")).toHaveCount(0);
  });

  test("downloads nanosaur terrain and texture files", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nanosaur", exact: true }),
    ).toBeVisible();

    await uploadNanosaurLevelFiles(page);

    await expect(levelActionsSummary(page)).toBeVisible({
      timeout: 30000,
    });

    const downloads: Download[] = [];
    page.on("download", (download) => {
      downloads.push(download);
    });

    await levelActionsSummary(page).click();
    await page.getByRole("button", { name: "Download", exact: true }).click();

    await expect
      .poll(() => downloads.length, {
        timeout: 10000,
      })
      .toBeGreaterThanOrEqual(2);

    const suggestedNames = downloads.map((download) =>
      download.suggestedFilename(),
    );
    expect(suggestedNames.some((name) => name.endsWith(".ter"))).toBeTruthy();
    expect(suggestedNames.some((name) => name.endsWith(".trt"))).toBeTruthy();
  });
});
