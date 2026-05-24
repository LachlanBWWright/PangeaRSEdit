#!/usr/bin/env node

import path from "node:path";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Jimp } from "jimp";
import { Game } from "../../src/data/globals/globals";

type ItemScreenshotKind = "terrainItem" | "splineItem";

type ManifestEntry = {
  game: Game;
  kind: ItemScreenshotKind;
  itemType: number;
  variantKey: "default";
  imageUrl: string;
  width: number;
  height: number;
  generatedFrom: {
    modelFile: string;
    modelIndex: number;
  };
  verificationStatus: "approximate";
};

const captureManifestEntrySchema = z.object({
  game: z.string().min(1),
  itemType: z.number().int().optional(),
  screenshot: z.string().min(1).optional(),
  spline: z.boolean().optional(),
  status: z.enum(["captured", "not-captured", "skip"]),
});

const captureManifestSchema = z.array(captureManifestEntrySchema);

function resolveFrontendRoot() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFilePath);
  return path.resolve(scriptsDir, "../..");
}

function mapGameLabelToEnum(gameLabel: string): Game | null {
  const normalized = gameLabel.toLowerCase();
  if (normalized.includes("otto")) return Game.OTTO_MATIC;
  if (normalized.includes("bugdom 2")) return Game.BUGDOM_2;
  if (normalized.includes("bugdom")) return Game.BUGDOM;
  if (normalized.includes("nanosaur 2")) return Game.NANOSAUR_2;
  if (normalized.includes("nanosaur")) return Game.NANOSAUR;
  if (normalized.includes("cro-mag") || normalized.includes("cromag")) {
    return Game.CRO_MAG;
  }
  if (normalized.includes("billy")) return Game.BILLY_FRONTIER;
  if (normalized.includes("mighty mike")) return Game.MIGHTY_MIKE;
  return null;
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function gamePublicSegment(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC:
      return "otto-matic";
    case Game.BUGDOM:
      return "bugdom";
    case Game.BUGDOM_2:
      return "bugdom-2";
    case Game.NANOSAUR:
      return "nanosaur";
    case Game.NANOSAUR_2:
      return "nanosaur-2";
    case Game.CRO_MAG:
      return "cro-mag-rally";
    case Game.BILLY_FRONTIER:
      return "billy-frontier";
    case Game.MIGHTY_MIKE:
      return "mighty-mike";
    default:
      return "unknown";
  }
}

async function getLatestCaptureDirectory(captureRoot: string) {
  const entries = await readdir(captureRoot, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory());

  const withStats = await Promise.all(
    dirs.map(async (entry) => {
      const fullPath = path.join(captureRoot, entry.name);
      const entryStat = await stat(fullPath);
      return {
        name: entry.name,
        fullPath,
        mtime: entryStat.mtimeMs,
      };
    }),
  );

  withStats.sort((a, b) => b.mtime - a.mtime);
  return withStats[0]?.fullPath ?? null;
}

async function copyOrResizeScreenshot(
  sourcePath: string,
  targetPath: string,
  targetSize: number | null,
) {
  if (!targetSize) {
    await copyFile(sourcePath, targetPath);
    return;
  }

  const image = await Jimp.read(sourcePath);
  image.contain({ w: targetSize, h: targetSize });
  await image.write(targetPath);
}

async function run() {
  const frontendRoot = resolveFrontendRoot();
  const captureRoot = path.join(
    frontendRoot,
    "screenshots",
    "item-model-capture",
  );
  const publicScreenshotsRoot = path.join(
    frontendRoot,
    "public",
    "item-screenshots",
  );
  const generatedManifestFile = path.join(
    frontendRoot,
    "src",
    "data",
    "items",
    "itemScreenshotManifest.generated.ts",
  );

  const requestedCaptureDir = process.env.ITEM_SCREENSHOT_CAPTURE_DIR;
  const captureDir = requestedCaptureDir
    ? path.resolve(frontendRoot, requestedCaptureDir)
    : await getLatestCaptureDirectory(captureRoot);

  if (!captureDir) {
    console.error(
      "No capture directory found. Run npm run dev:capture:item-screenshots first.",
    );
    process.exitCode = 1;
    return;
  }

  const captureManifestPath = path.join(captureDir, "manifest.json");
  const rawManifest = await readFile(captureManifestPath, "utf8");
  const parsed = captureManifestSchema.safeParse(JSON.parse(rawManifest));
  if (!parsed.success) {
    console.error("Invalid capture manifest format", parsed.error.message);
    process.exitCode = 1;
    return;
  }

  await rm(publicScreenshotsRoot, { recursive: true, force: true });
  await mkdir(publicScreenshotsRoot, { recursive: true });

  const resizeSizeRaw = process.env.ITEM_SCREENSHOT_SIZE;
  const resizeSize = resizeSizeRaw ? Number.parseInt(resizeSizeRaw, 10) : null;
  const targetSize =
    resizeSize !== null && Number.isFinite(resizeSize) && resizeSize > 0
      ? resizeSize
      : null;

  const dedupe = new Set<string>();
  const manifestEntries: ManifestEntry[] = [];

  for (const entry of parsed.data) {
    if (entry.status !== "captured") continue;
    if (entry.itemType === undefined || !entry.screenshot) continue;

    const mappedGame = mapGameLabelToEnum(entry.game);
    if (mappedGame === null) continue;

    const kind: ItemScreenshotKind = entry.spline
      ? "splineItem"
      : "terrainItem";
    const dedupeKey = `${String(mappedGame)}:${kind}:${String(entry.itemType)}`;
    if (dedupe.has(dedupeKey)) continue;

    const sourcePath = path.join(captureDir, entry.screenshot);
    const targetDir = path.join(
      publicScreenshotsRoot,
      gamePublicSegment(mappedGame),
      kind,
    );
    await mkdir(targetDir, { recursive: true });

    const fileBase = `${String(entry.itemType).padStart(4, "0")}-${sanitizeSegment(entry.game)}`;
    const fileName = `${fileBase}.png`;
    const targetPath = path.join(targetDir, fileName);
    await copyOrResizeScreenshot(sourcePath, targetPath, targetSize);

    const image = await Jimp.read(targetPath);

    manifestEntries.push({
      game: mappedGame,
      kind,
      itemType: entry.itemType,
      variantKey: "default",
      imageUrl: `/PangeaRSEdit/item-screenshots/${gamePublicSegment(mappedGame)}/${kind}/${fileName}`,
      width: image.bitmap.width,
      height: image.bitmap.height,
      generatedFrom: {
        modelFile: "capture-item-screenshots",
        modelIndex: 0,
      },
      verificationStatus: "approximate",
    });
    dedupe.add(dedupeKey);
  }

  manifestEntries.sort((a, b) => {
    if (a.game !== b.game) return a.game - b.game;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.itemType - b.itemType;
  });

  const generatedSource = [
    "/* eslint-disable */",
    "// Auto-generated by scripts/dev/build-item-screenshot-manifest.ts",
    'import type { ItemScreenshotManifestEntry } from "@/data/items/itemScreenshotManifest";',
    "",
    "export const GENERATED_ITEM_SCREENSHOT_MANIFEST =",
    `${JSON.stringify(manifestEntries, null, 2)} as const satisfies readonly ItemScreenshotManifestEntry[];`,
    "",
  ].join("\n");

  await writeFile(generatedManifestFile, generatedSource, "utf8");

  console.log(`Using capture directory: ${captureDir}`);
  console.log(
    `Generated ${String(manifestEntries.length)} screenshot manifest entries.`,
  );
  console.log(`Images written to ${publicScreenshotsRoot}`);
  console.log(`Manifest written to ${generatedManifestFile}`);
}

void run();
