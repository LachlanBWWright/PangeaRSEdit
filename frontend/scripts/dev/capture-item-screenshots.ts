#!/usr/bin/env node

import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, type ChildProcess } from "node:child_process";
import { ResultAsync, type Result } from "neverthrow";
import { z } from "zod";

type CaptureStatus = "captured" | "not-captured" | "skip";

interface CaptureManifestEntry {
  game: string;
  itemLabel: string;
  itemType?: number;
  itemName?: string;
  mapped?: boolean;
  spline?: boolean;
  status: CaptureStatus;
  screenshot?: string;
  modelStatus?: string;
  reason?: string;
}

const DEFAULT_PORT = 4174;
const DEFAULT_HOST = "127.0.0.1";
const STATUS_TIMEOUT_MS = 20000;
const LOAD_SETTLE_DELAY_MS = 150;
const outputRoot = path.resolve(
  process.cwd(),
  "screenshots/item-model-capture",
);

const itemLabelSchema = z
  .string()
  .trim()
  .regex(/^\s*-?\d+\s*:\s*.+$/u);

const parsedItemLabelSchema = z.object({
  itemType: z.number().int(),
  itemName: z.string().min(1),
  isSpline: z.boolean(),
  hasMapping: z.boolean(),
});

const unknownErrorSchema = z.object({
  message: z.string(),
});

function mapErr(error: unknown): string {
  const parsed = unknownErrorSchema.safeParse(error);
  return parsed.success ? parsed.data.message : String(error);
}

function ignoreError<T>(result: Result<T, string>): void {
  if (result.isErr()) {
    return;
  }
}

function sanitizeSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function parseItemLabel(input: string) {
  const parsed = itemLabelSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  const match = /^\s*(-?\d+)\s*:\s*(.+)$/u.exec(parsed.data);
  if (!match) {
    return null;
  }

  const itemType = Number.parseInt(match[1], 10);
  if (Number.isNaN(itemType)) {
    return null;
  }

  const fullName = match[2].trim();
  const isSpline = fullName.includes("↺");
  const hasMapping = fullName.includes("✓");
  const cleanedName = fullName
    .replace(/[✓↺⚙]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  const finalResult = parsedItemLabelSchema.safeParse({
    itemType,
    itemName: cleanedName,
    isSpline,
    hasMapping,
  });

  return finalResult.success ? finalResult.data : null;
}

function startViteDevServer(
  cwd: string,
  port: number,
  host: string,
): ChildProcess {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const child = spawn(
    command,
    ["run", "dev", "--", "--host", host, "--port", String(port)],
    {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        FORCE_COLOR: "1",
      },
    },
  );

  child.stdout?.on("data", (chunk: Buffer | string) => {
    process.stdout.write(`[vite] ${String(chunk)}`);
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    process.stderr.write(`[vite] ${String(chunk)}`);
  });

  return child;
}

async function waitForServer(url: string, timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const responseResult = await ResultAsync.fromPromise(
      fetch(url, { method: "GET" }),
      mapErr,
    );
    if (responseResult.isOk() && responseResult.value.ok) {
      return true;
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  return false;
}

async function selectByTriggerAndLabel(
  page: Page,
  triggerTestId: string,
  label: string,
): Promise<void> {
  const trigger = page.getByTestId(triggerTestId);
  await trigger.click();
  await page.getByRole("option", { name: label, exact: true }).first().click();
}

async function readOpenSelectOptions(page: Page): Promise<string[]> {
  const options = await page.getByRole("option").evaluateAll((elements) =>
    elements
      .map((element) => element.textContent ?? "")
      .map((label) => label.trim())
      .filter((label) => label.length > 0),
  );
  return options;
}

async function waitForLoadCompletion(page: Page): Promise<string> {
  const status = page.getByTestId("item-model-status");
  const startedAt = Date.now();

  while (Date.now() - startedAt < STATUS_TIMEOUT_MS) {
    const statusText = (await status.textContent()) ?? "";
    if (
      statusText.startsWith("Loaded:") ||
      statusText.startsWith("Error loading") ||
      statusText.includes("No model mapping available")
    ) {
      break;
    }

    await page.waitForTimeout(100);
  }

  const statusText = (await status.textContent()) ?? "";
  if (statusText.startsWith("Loaded:")) {
    const fitReadyResult = await ResultAsync.fromPromise(
      page
        .locator(
          '[data-testid="item-model-canvas-container"][data-fit-ready="1"]',
        )
        .waitFor({ timeout: 10000 }),
      mapErr,
    );
    ignoreError(fitReadyResult);
  }

  await page.waitForTimeout(LOAD_SETTLE_DELAY_MS);
  return statusText;
}

async function captureCanvasScreenshot(
  page: Page,
): Promise<Result<Buffer, string>> {
  const canvas = page
    .locator('[data-testid="item-model-canvas-container"] canvas')
    .first();
  return ResultAsync.fromPromise(canvas.screenshot({ type: "png" }), mapErr);
}

function resolveFrontendRoot(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const scriptsDir = path.dirname(currentFilePath);
  return path.resolve(scriptsDir, "../..");
}

async function runCapture(): Promise<number> {
  const frontendRoot = resolveFrontendRoot();
  const baseOrigin =
    process.env.ITEM_CAPTURE_BASE_ORIGIN ??
    `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
  const appPath =
    process.env.ITEM_CAPTURE_APP_PATH ??
    "/PangeaRSEdit/#/item-models?capture=1";
  const appUrl = `${baseOrigin}${appPath}`;
  const serverProbeUrl = `${baseOrigin}/PangeaRSEdit/`;
  const skipServer = process.env.ITEM_CAPTURE_SKIP_SERVER === "1";

  const captureTimestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(outputRoot, captureTimestamp);
  const manifestPath = path.join(outputDir, "manifest.json");

  const createOutputDirResult = await ResultAsync.fromPromise(
    mkdir(outputDir, { recursive: true }),
    mapErr,
  );
  if (createOutputDirResult.isErr()) {
    console.error(
      `Failed to create output directory: ${createOutputDirResult.error}`,
    );
    return 1;
  }

  let devServer: ChildProcess | null = null;
  const alreadyRunning = await waitForServer(serverProbeUrl, 3000);
  if (!alreadyRunning && !skipServer) {
    devServer = startViteDevServer(frontendRoot, DEFAULT_PORT, DEFAULT_HOST);
  }

  const ready = await waitForServer(serverProbeUrl, 120000);
  if (!ready) {
    console.error(`Dev server did not become ready at ${serverProbeUrl}`);
    if (devServer) {
      devServer.kill("SIGTERM");
    }
    return 1;
  }

  const manifest: CaptureManifestEntry[] = [];

  const captureResult = await ResultAsync.fromPromise(
    (async () => {
      // Discover game labels using a short-lived browser session.
      const discoverBrowser = await chromium.launch({ headless: true });
      const discoverPage = await discoverBrowser.newPage({
        viewport: { width: 1920, height: 1080 },
      });

      await discoverPage.goto(appUrl, { waitUntil: "domcontentloaded" });
      await discoverPage
        .getByTestId("item-model-game-select-trigger")
        .waitFor({ state: "visible", timeout: 120000 });

      await discoverPage.getByTestId("item-model-game-select-trigger").click();
      const discoveredGameLabels = await readOpenSelectOptions(discoverPage);
      await discoverPage.keyboard.press("Escape");
      await discoverBrowser.close();
      console.log(
        `Discovered ${discoveredGameLabels.length} games in selector.`,
      );

      const onlyGamesRaw = process.env.ITEM_CAPTURE_ONLY_GAMES?.trim() ?? "";
      const onlyGames = onlyGamesRaw
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label.length > 0);

      const gameLabels =
        onlyGames.length === 0
          ? discoveredGameLabels
          : discoveredGameLabels.filter((label) =>
              onlyGames.some((allowed) =>
                label.toLowerCase().includes(allowed.toLowerCase()),
              ),
            );

      if (onlyGames.length > 0) {
        console.log(
          `Filtering games with ITEM_CAPTURE_ONLY_GAMES=${onlyGamesRaw} -> ${gameLabels.length} selected.`,
        );
      }

      for (const gameLabel of gameLabels) {
        const gameBrowserRef: { current: Browser | null } = { current: null };
        const gameResult = await ResultAsync.fromPromise(
          (async () => {
            console.log(`Processing game: ${gameLabel}`);

            // Isolate each game in a fresh browser process to avoid WebGL memory buildup.
            gameBrowserRef.current = await chromium.launch({ headless: true });
            const page = await gameBrowserRef.current.newPage({
              viewport: { width: 1920, height: 1080 },
            });

            await page.goto(appUrl, { waitUntil: "domcontentloaded" });
            await page
              .getByTestId("item-model-game-select-trigger")
              .waitFor({ state: "visible", timeout: 30000 });

            await selectByTriggerAndLabel(
              page,
              "item-model-game-select-trigger",
              gameLabel,
            );

            const itemSelectVisibleResult = await ResultAsync.fromPromise(
              page
                .getByTestId("item-model-item-select-trigger")
                .waitFor({ state: "visible", timeout: 3000 }),
              mapErr,
            );
            ignoreError(itemSelectVisibleResult);

            await page.getByTestId("item-model-item-select-trigger").click();
            const itemLabels = await readOpenSelectOptions(page);
            await page.keyboard.press("Escape");
            console.log(`Found ${itemLabels.length} items for ${gameLabel}`);

            for (const itemLabel of itemLabels) {
              const itemResult = await ResultAsync.fromPromise(
                (async () => {
                  const parsedLabel = parseItemLabel(itemLabel);
                  if (!parsedLabel) {
                    return;
                  }

                  if (parsedLabel.isSpline) {
                    return;
                  }

                  await selectByTriggerAndLabel(
                    page,
                    "item-model-item-select-trigger",
                    itemLabel,
                  );

                  const loadButton = page.getByTestId(
                    "item-model-load-button",
                  );
                  const canLoadModel = await loadButton.isEnabled();

                  let statusText = "";
                  if (canLoadModel) {
                    await loadButton.click();
                    statusText = await waitForLoadCompletion(page);
                  } else {
                    statusText =
                      (await page
                        .getByTestId("item-model-status")
                        .textContent()) ?? "";
                  }

                  const gameDir = path.join(
                    outputDir,
                    sanitizeSegment(gameLabel),
                    "normal-items",
                  );
                  await mkdir(gameDir, { recursive: true });

                  const fileName = `${String(parsedLabel.itemType).padStart(4, "0")}-${sanitizeSegment(parsedLabel.itemName)}.png`;
                  const targetPath = path.join(gameDir, fileName);

                  if (statusText.startsWith("Loaded:")) {
                    const pngBufferResult =
                      await captureCanvasScreenshot(page);
                    if (pngBufferResult.isErr()) {
                      return;
                    }

                    await writeFile(targetPath, pngBufferResult.value);

                    manifest.push({
                      game: gameLabel,
                      itemLabel,
                      itemType: parsedLabel.itemType,
                      itemName: parsedLabel.itemName,
                      mapped: parsedLabel.hasMapping,
                      spline: parsedLabel.isSpline,
                      status: "captured",
                      screenshot: path.relative(outputDir, targetPath),
                      modelStatus: statusText,
                    });
                  } else {
                    manifest.push({
                      game: gameLabel,
                      itemLabel,
                      itemType: parsedLabel.itemType,
                      itemName: parsedLabel.itemName,
                      mapped: parsedLabel.hasMapping,
                      spline: parsedLabel.isSpline,
                      status: "not-captured",
                      modelStatus: statusText,
                    });
                  }
                })(),
                mapErr,
              );
              ignoreError(itemResult);
            }

            // Persist after each game so partial runs keep progress.
            await writeFile(
              manifestPath,
              `${JSON.stringify(manifest, null, 2)}\n`,
              "utf8",
            );
          })(),
          mapErr,
        );
        if (gameResult.isErr()) {
          manifest.push({
            game: gameLabel,
            itemLabel: "__game__",
            status: "skip",
            reason: gameResult.error,
          });
          console.error(`Failed game ${gameLabel}: ${gameResult.error}`);
        }

        if (gameBrowserRef.current) {
          const closeGameBrowserResult = await ResultAsync.fromPromise(
            gameBrowserRef.current.close(),
            mapErr,
          );
          ignoreError(closeGameBrowserResult);
          gameBrowserRef.current = null;
        }

        const persistGameResult = await ResultAsync.fromPromise(
          writeFile(
            manifestPath,
            `${JSON.stringify(manifest, null, 2)}\n`,
            "utf8",
          ),
          mapErr,
        );
        ignoreError(persistGameResult);
      }

      await writeFile(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8",
      );

      const totalScreenshots = (await import("fs"))
        .readdirSync(outputDir, { recursive: true })
        .filter((f: string | Buffer) => String(f).endsWith(".png")).length;

      console.log(`Saved screenshots to: ${outputDir}`);
      console.log(`Total: ${totalScreenshots} screenshots captured`);
      return 0;
    })(),
    mapErr,
  );

  if (devServer) {
    devServer.kill("SIGTERM");
  }

  if (captureResult.isErr()) {
    console.error(captureResult.error);
    return 1;
  }

  return captureResult.value;
}

void ResultAsync.fromPromise(runCapture(), mapErr).map((exitCode) => {
  process.exitCode = exitCode;
});
