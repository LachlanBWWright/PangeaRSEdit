import { expect, test, type Download, type Locator, type Page } from "@playwright/test";
import { Buffer } from "node:buffer";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
interface ArchiveCase {
  readonly title: string;
  readonly gameTitle: string;
  readonly levelPath: string;
  readonly texturePath: string | undefined;
}

const archiveCases: readonly ArchiveCase[] = [
  {
    title: "Otto Matic",
    gameTitle: "Otto Matic",
    levelPath: "../../public/assets/ottoMatic/terrain/EarthFarm.ter.rsrc",
    texturePath: "../../public/assets/ottoMatic/terrain/EarthFarm.ter",
  },
  {
    title: "Cro-Mag Rally",
    gameTitle: "Cro-Mag Rally",
    levelPath:
      "../../public/assets/croMag/terrain/IronAge_Europe.ter.rsrc",
    texturePath: "../../public/assets/croMag/terrain/IronAge_Europe.ter",
  },
  {
    title: "Billy Frontier",
    gameTitle: "Billy Frontier",
    levelPath:
      "../../public/assets/billyFrontier/terrain/town_duel.ter.rsrc",
    texturePath: "../../public/assets/billyFrontier/terrain/town_duel.ter",
  },
  {
    title: "Bugdom",
    gameTitle: "Bugdom",
    levelPath: "../../public/assets/bugdom/terrain/Lawn.ter.rsrc",
    texturePath: undefined,
  },
  {
    title: "Bugdom 2",
    gameTitle: "Bugdom 2",
    levelPath: "../../public/assets/bugdom2/terrain/Level3_DogHair.ter.rsrc",
    texturePath: "../../public/assets/bugdom2/terrain/Level3_DogHair.ter",
  },
  {
    title: "Nanosaur 2",
    gameTitle: "Nanosaur 2",
    levelPath: "../../public/assets/nanosaur2/terrain/level1.ter.rsrc",
    texturePath: "../../public/assets/nanosaur2/terrain/level1.ter",
  },
  {
    title: "Nanosaur",
    gameTitle: "Nanosaur",
    levelPath: "../../public/assets/nanosaur/terrain/Level1.ter",
    texturePath: "../../public/assets/nanosaur/terrain/Level1.trt",
  },
  {
    title: "Nanosaur 2 Race 1",
    gameTitle: "Nanosaur 2",
    levelPath: "../../public/assets/nanosaur2/terrain/race1.ter.rsrc",
    texturePath: "../../public/assets/nanosaur2/terrain/race1.ter",
  },
  {
    title: "Nanosaur 2 Battle 1",
    gameTitle: "Nanosaur 2",
    levelPath: "../../public/assets/nanosaur2/terrain/battle1.ter.rsrc",
    texturePath: "../../public/assets/nanosaur2/terrain/battle1.ter",
  },
  {
    title: "Nanosaur 2 Capture the Flag 1",
    gameTitle: "Nanosaur 2",
    levelPath: "../../public/assets/nanosaur2/terrain/flag1.ter.rsrc",
    texturePath: "../../public/assets/nanosaur2/terrain/flag1.ter",
  },
  {
    title: "Mighty Mike",
    gameTitle: "Mighty Mike",
    levelPath: "../../public/assets/mightyMike/terrain/candy.map-1",
    texturePath: "../../public/assets/mightyMike/terrain/candy.tileset",
  },
];

test.describe.configure({ mode: "serial" });

function gameCard(page: Page, title: string): Locator {
  return page
    .locator("div.bg-gray-800")
    .filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    })
    .first();
}

function malformedArchiveFiles(archiveCase: ArchiveCase): {
  name: string;
  mimeType: string;
  buffer: Buffer;
}[] {
  const levelName = path.basename(archiveCase.levelPath);
  const files = [
    {
      name: levelName,
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a terrain archive"),
    },
  ];
  if (archiveCase.texturePath !== undefined) {
    files.push({
      name: path.basename(archiveCase.texturePath),
      mimeType: "application/octet-stream",
      buffer: Buffer.from("not a terrain archive"),
    });
  }
  return files;
}

async function uploadArchiveFiles(
  page: Page,
  title: string,
  levelPath: string,
  texturePath: string | undefined,
): Promise<void> {
  const files = [path.resolve(__dirname, levelPath)];
  if (texturePath !== undefined) {
    files.push(path.resolve(__dirname, texturePath));
  }
  await gameCard(page, title)
    .locator('input[type="file"]')
    .setInputFiles(files);
}

for (const archiveCase of archiveCases) {
  test(`round-trips the ${archiveCase.title} native level archive through the production uploader`, async ({
    page,
  }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: archiveCase.gameTitle ?? archiveCase.title,
      exact: true,
    }),
  ).toBeVisible();
  await uploadArchiveFiles(
    page,
    archiveCase.gameTitle ?? archiveCase.title,
    archiveCase.levelPath,
    archiveCase.texturePath,
  );

  const levelActions = page.locator("summary").filter({
    hasText: "Level Actions",
  });
  await expect(levelActions).toBeVisible({ timeout: 30000 });
  await levelActions.click();

  const downloads: Download[] = [];
  page.on("download", (download) => {
    downloads.push(download);
  });
  await page.getByRole("button", { name: "Download Level", exact: true }).click();
  await expect
    .poll(() => downloads.length, { timeout: 10000 })
    .toBe(archiveCase.texturePath === undefined ? 1 : 2);

  const uploadedFiles: {
    name: string;
    mimeType: string;
    buffer: Buffer;
  }[] = [];
  for (const download of downloads) {
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    if (downloadPath === null) {
      return;
    }
    uploadedFiles.push({
      name: download.suggestedFilename(),
      mimeType: "application/octet-stream",
      buffer: Buffer.from(await readFile(downloadPath)),
    });
  }

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: archiveCase.gameTitle ?? archiveCase.title,
      exact: true,
    }),
  ).toBeVisible();
  await gameCard(page, archiveCase.gameTitle ?? archiveCase.title)
    .locator('input[type="file"]')
    .setInputFiles(uploadedFiles);
  await expect(page.locator("summary").filter({ hasText: "Level Actions" })).toBeVisible({
    timeout: 30000,
  });
  });
}

for (const archiveCase of archiveCases) {
  test(`surfaces a malformed ${archiveCase.title} archive diagnostic in the production uploader`, async ({
    page,
  }) => {
    test.setTimeout(30_000);
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: archiveCase.gameTitle,
        exact: true,
      }),
    ).toBeVisible();
    await gameCard(page, archiveCase.gameTitle)
      .locator('input[type="file"]')
      .setInputFiles(malformedArchiveFiles(archiveCase));
    await expect(
      page.getByText("Failed to parse level data", { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });
}
