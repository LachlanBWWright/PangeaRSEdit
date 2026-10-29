import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { convertModelFiles } from "@pangea/model-codec/node";
import { customItemModelFixture } from "./customItemModelFixture";
import { verifyRejectedReloads } from "./customItemReloadRegression";
import { verifyEnemyOwnership, verifyMeleeOverrides } from "./customItemNativeRegressions";
import { expectNoLuaFailures, expectRuntimeHealthy, runtimeHealth } from "./scriptRuntimeHealth";

async function playerInteractionCheckpoint(page: Page, pickupId: string | undefined, stage: string) {
  const status = await page.evaluate((id) => window.Module?.ccall?.(
    "OttoScript_ProbeCustomPickupJS", "number", ["string", "string", "number"], [id, "health", 0.25],
  ), pickupId);
  return { stage, status };
}

test("real Otto engine dispatches imported skeletal enemy behavior and preserves native actor combat", async ({ page }) => {
  test.setTimeout(120_000);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-custom-native-"));
  const source = path.join(directory, "enemy.glb");
  const output = path.join(directory, "enemy.bg3d");
  await fs.writeFile(source, customItemModelFixture());
  const conversion = await convertModelFiles(source, output, { target: "ottomatic" });
  expect(conversion.isErr() ? conversion.error : null).toBeNull();
  if (conversion.isErr()) { await fs.rm(directory, { recursive: true, force: true }); return; }
  const model = Array.from(await fs.readFile(output));
  const skeletonFile = conversion.value.files.find((file) => file.endsWith(".skeleton.rsrc"));
  expect(skeletonFile).toBeDefined();
  if (!skeletonFile) { await fs.rm(directory, { recursive: true, force: true }); return; }
  const skeleton = Array.from(await fs.readFile(skeletonFile));
  await fs.rm(directory, { recursive: true, force: true });
  const errors: string[] = [];
  const messages: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => messages.push(message.text()));
  await page.goto("./");
  const installed = await page.evaluate(async ({ model, skeleton }) => {
    const modulePath = "/PangeaRSEdit/tests/e2e/customItemRuntimeFixture.ts";
    const fixtureModule: typeof import("./customItemRuntimeFixture") = await import(modulePath);
    const fixture = await fixtureModule.customItemRuntimeFixture(model, skeleton);
    if (fixture.isErr()) return { error: fixture.error, probes: [] };
    const config = fixture.value.files.find((file) => file.path === "Data/Scripts/config/levels.json");
    const configText = config ? new TextDecoder().decode(new Uint8Array(config.bytes)) : "";
    return { error: "", configText, files: fixture.value.files, probes: fixture.value.probes, melee: fixture.value.melee,
      platformId: fixture.value.platformId, pickups: fixture.value.pickups, triggerId: fixture.value.triggerId };
  }, { model, skeleton });
  expect(installed.error).toBe("");
  const dispatcher = installed.files?.find((file) => file.path === "Data/Scripts/dist/main.lua");
  if (dispatcher) await fs.writeFile(test.info().outputPath("generated-main.lua"), new Uint8Array(dispatcher.bytes));
  await page.addInitScript((files) => {
    window.Module = {
      canvas: document.createElement("canvas"), arguments: [], locateFile: (path: string) => path,
      preRun: [function () {
        const runtime = window.Module;
        if (!runtime?.FS?.writeFile) return;
        const initialized = runtime.onRuntimeInitialized;
        runtime.onRuntimeInitialized = () => {
          for (const file of files) {
            const parts = file.path.split("/");
            for (let depth = 1; depth < parts.length; depth++) {
              const directory = `/${parts.slice(0, depth).join("/")}`;
              if (!runtime.FS?.analyzePath?.(directory).exists) runtime.FS?.mkdir?.(directory);
            }
            runtime.FS?.writeFile(file.path, new Uint8Array(file.bytes));
          }
          initialized?.();
        };
      }],
    };
  }, installed.files ?? []);
  await page.goto("generated/pangea-ports/wasm/ottomatic/OttoMatic.html?level=0");
  await expect.poll(async () => {
    await fs.writeFile(test.info().outputPath("startup-diagnostics.json"), JSON.stringify({ messages, errors }, null, 2));
    return messages.some((message) => message.includes("acceptance authored placement native health7"));
  }, { timeout: 60_000 }).toBe(true);
  const rejectedReloads = await verifyRejectedReloads(page, messages, installed.configText ?? "");
  await page.waitForFunction(() => window.Module?.ccall?.("PangeaScript_IsEnabled", "boolean", [], []) === true, null, { timeout: 30_000 });
  const configured = await page.evaluate(() => {
    const runtime = window.Module;
    const config = runtime?.ccall?.("PangeaScript_SetConfigPath", "number", ["string"], ["/Data/Scripts/config/levels.json"]);
    const loaded = runtime?.ccall?.("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
    const error = runtime?.ccall?.("PangeaScript_GetStatusLastError", "string", [], []);
    return { config, loaded, error };
  });
  if (configured.loaded !== 0) await fs.writeFile(test.info().outputPath("runtime-config.json"), installed.configText ?? "");
  expect(configured.config).toBe(0);
  expect(configured.loaded, String(configured.error)).toBe(0);
  await expectRuntimeHealthy(page, messages, 3);
  await expect.poll(() => page.evaluate(() => window.Module?.ccall?.("PangeaScript_GetStatusHooksCalledCount", "number", [], [])), { timeout: 30_000 }).toBeGreaterThan(0);
  const healthPickupId = installed.pickups?.[0]?.id;
  const checkpoints = [await playerInteractionCheckpoint(page, healthPickupId, "after config reload")];
  await expectRuntimeHealthy(page, messages, 3);
  const gameplayResults: { id: string; status: unknown; error: unknown }[] = [];
  for (const probe of installed.probes) {
    const result = await page.evaluate(({ id, damage }) => {
      const runtime = window.Module;
      return {
        status: runtime?.ccall?.("OttoScript_ProbeCustomObjectGameplayJS", "number", ["string", "number", "number"], [id, 3, damage]),
        error: runtime?.ccall?.("PangeaScript_GetStatusLastError", "string", [], []),
      };
    }, probe);
    gameplayResults.push({ id: probe.id, ...result });
    await expectRuntimeHealthy(page, messages, 3, true, `after gameplay ${probe.id}`);
    checkpoints.push(await playerInteractionCheckpoint(page, healthPickupId, `after ${probe.id}`));
    await expectRuntimeHealthy(page, messages, 3, true, `after health pickup ${probe.id}`);
  }
  const platformResult = await page.evaluate((id) => {
    const runtime = window.Module;
    return {
      status: runtime?.ccall?.("OttoScript_ProbeCustomPlatformJS", "number", ["string"], [id]),
      error: runtime?.ccall?.("PangeaScript_GetStatusLastError", "string", [], []),
    };
  }, installed.platformId);
  await expectRuntimeHealthy(page, messages, 3, true, "after platform movement");
  checkpoints.push(await playerInteractionCheckpoint(page, healthPickupId, "after platform movement"));
  await expectRuntimeHealthy(page, messages, 3);
  const melee = await verifyMeleeOverrides(page, installed.melee ?? [], 3);
  const ownership = await verifyEnemyOwnership(page, installed.probes[0]?.id ?? "", installed.probes[1]?.id ?? "", installed.configText ?? "", 3);
  const interactions = await page.evaluate(({ pickups, triggerId }) => {
    const runtime = window.Module;
    return {
      pickups: pickups?.map(({ id, reward, amount }) => runtime?.ccall?.("OttoScript_ProbeCustomPickupJS", "number", ["string", "string", "number"], [id, reward, amount])),
      trigger: runtime?.ccall?.("OttoScript_ProbeCustomTriggerJS", "number", ["string"], [triggerId]),
      error: runtime?.ccall?.("PangeaScript_GetStatusLastError", "string", [], []),
    };
  }, { pickups: installed.pickups, triggerId: installed.triggerId });
  const health = await runtimeHealth(page);
  expectNoLuaFailures(messages);
  expect(health).toMatchObject({ enabled: true, bundleLoaded: true, scriptsDisabled: false, errorCount: 3, budgetExceeded: 0, lastError: "" });
  const results = { rejectedReloads, melee, ownership, health, checkpoints, gameplay: gameplayResults, platform: platformResult, interactions };
  const diagnostics = test.info().outputPath("native-diagnostics.json");
  await fs.writeFile(diagnostics, JSON.stringify({ results, messages, errors }, null, 2));
  await test.info().attach("native-runtime-diagnostics", {
    path: diagnostics, contentType: "application/json",
  });
  expect(results, JSON.stringify(results)).toMatchObject({
    checkpoints: [{ status: 0 }, { status: 0 }, { status: 0 }, { status: 0 }],
    gameplay: [{ status: 0 }, { status: 0 }], platform: { status: 0 },
    interactions: { pickups: [0, 0, 0], trigger: 0 },
  });
  expect(messages.some((message) => message.includes("acceptance native variant frame"))).toBe(true);
  expect(errors).toEqual([]);
});
