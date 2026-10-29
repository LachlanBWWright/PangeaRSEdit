import { expect, test } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { authorBrainPort } from "./brainPortAuthoring";
import { expectNoLuaFailures, runtimeHealth, runtimeInspector, runtimeObjectDefinition, runtimeObjects } from "./scriptRuntimeHealth";

test.use({ actionTimeout: 15_000 });

test("authors, places and exports a Brain Port that spawns aliens without the brain boss", async ({ page }) => {
  test.setTimeout(180_000);
  const archive = await test.step("Create the model, Lua behavior and farm placement through the editor", () => authorBrainPort(page, test.info().outputPath("brain-port.zip")));
  await test.info().attach("brain-port-script-package", { path: archive, contentType: "application/zip" });
  const archiveBytes = Array.from(await readFile(archive));
  const installed = await test.step("Reimport the exported package through the production package API", () => page.evaluate(async (bytes) => {
    const workspacePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
    const globalsPath = "/PangeaRSEdit/src/data/globals/globals.ts";
    const workspace: typeof import("../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(workspacePath);
    const globals: typeof import("../../src/data/globals/globals") = await import(globalsPath);
    const restored = await workspace.importScriptPackageZipAsync(new Uint8Array(bytes), workspace.createScriptWorkspaceContext(globals.OttoGlobals, 0));
    if (restored.isErr()) return { error: restored.error, files: [], definition: null, placements: [] };
    const files = await workspace.buildScriptPackageFilesAsync(restored.value);
    return {
      error: files.isErr() ? files.error : "",
      files: files.isOk() ? files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) : [],
      definition: restored.value.customObjects.find((object) => object.id === "custom.brain-port") ?? null,
      placements: restored.value.levels[restored.value.context.levelKey]?.customPlacements ?? [],
    };
  }, archiveBytes));
  expect(installed.error).toBe("");
  expect(installed.definition).toMatchObject({ id: "custom.brain-port", visual: {
    kind: "customDisplayGroup", modelObject: 5, scale: 3.5,
  } });
  expect(installed.placements).toHaveLength(1);
  expect(installed.placements[0]).toMatchObject({ objectId: "custom.brain-port", position: { x: 340, y: 0, z: 2150 } });
  const messages: string[] = [];
  const errors: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/generated/pangea-ports/wasm/ottomatic/OttoMatic.js*", async (route) => {
    const response = await route.fetch();
    const loader = await response.text();
    const preload = `window.Module.preRun = [...(window.Module.preRun || []), function () {
      const runtime = window.Module;
      const initialized = runtime.onRuntimeInitialized;
      runtime.onRuntimeInitialized = function () {
        for (const file of ${JSON.stringify(installed.files)}) {
          const parts = file.path.split('/');
          for (let depth = 1; depth < parts.length; depth++) {
            const directory = '/' + parts.slice(0, depth).join('/');
            if (!runtime.FS.analyzePath(directory).exists) runtime.FS.mkdir(directory);
          }
          runtime.FS.writeFile(file.path, new Uint8Array(file.bytes));
        }
        initialized?.();
      };
    }];\n`;
    await route.fulfill({ response, body: preload + loader });
  });
  await test.step("Run that exact package in the real Otto farm runtime", async () => {
    await page.goto("generated/pangea-ports/wasm/ottomatic/OttoMatic.html?level=0");
    await expect.poll(() => messages.some((message) => message.includes("independent brain port spawned 3")), { timeout: 60_000 }).toBe(true);
    const snapshot = await runtimeInspector(page);
    const objects = await runtimeObjects(page);
    const diagnostics = test.info().outputPath("brain-port-runtime.json");
    await writeFile(diagnostics, JSON.stringify({ snapshot, objects, messages, errors }, null, 2));
    await test.info().attach("brain-port-runtime", { path: diagnostics, contentType: "application/json" });
    const port = objects.find((object) => runtimeObjectDefinition(object) === "custom.brain-port");
    expect(port?.state).toMatchObject({ spawned: "3", level: "0" });
    expect(objects.filter((object) => object.type === "ottomatic.enemy.brainalien" && object.state.origin === "independent-brain-port")).toHaveLength(3);
    expect(objects.some((object) => /brainboss/i.test(object.type))).toBe(false);
    expect(await runtimeHealth(page)).toMatchObject({ enabled: true, bundleLoaded: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
    expectNoLuaFailures(messages);
    expect(errors).toEqual([]);
  });
  await test.step("Respect the Lua quota and clean up the spawner and its aliens", async () => {
    await expect.poll(async () => Number((await runtimeInspector(page))?.objects
      .find((object) => runtimeObjectDefinition(object) === "custom.brain-port")?.state.elapsed), { timeout: 15_000 }).toBeGreaterThan(2.5);
    expect(messages.filter((message) => message.includes("independent brain port spawned "))).toHaveLength(3);
    const port = (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "custom.brain-port");
    expect(port).toBeDefined();
    if (!port) return;
    expect(await page.evaluate(({ id, generation }) => window.Module?.ccall?.(
      "PangeaScript_DeleteObjectJS", "boolean", ["number", "number"], [id, generation],
    ), { id: port.id, generation: port.generation })).toBe(true);
    await expect.poll(() => messages.some((message) => message.includes("independent brain port destroyed"))).toBe(true);
    const after = await runtimeInspector(page);
    expect((await runtimeObjects(page)).filter((object) => runtimeObjectDefinition(object) === "custom.brain-port" || object.state.origin === "independent-brain-port")).toEqual([]);
    expect(after?.runtime.timers).toBe(0);
    const frame = after?.runtime.frame ?? 0;
    await expect.poll(async () => (await runtimeInspector(page))?.runtime.frame, { timeout: 30_000 }).toBeGreaterThan(frame + 60);
    expect(messages.filter((message) => message.includes("independent brain port spawned "))).toHaveLength(3);
    expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
    expectNoLuaFailures(messages);
    expect(errors).toEqual([]);
  });
});
