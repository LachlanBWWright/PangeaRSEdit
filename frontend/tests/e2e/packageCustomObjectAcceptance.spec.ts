import { expect, test } from "@playwright/test";
import { packageAcceptanceTargets } from "../fixtures/packageAcceptanceTargets";
import { expectNoLuaFailures } from "./scriptRuntimeHealth";

for (const target of packageAcceptanceTargets) {
  test(`${target.name} runs custom-object assets and lifecycle from an exported/reimported production workspace`, async ({ page }) => {
    test.setTimeout(120_000);
    const messages: string[] = [];
    const errors: string[] = [];
    page.on("console", (message) => messages.push(message.text()));
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/__package-acceptance.html", (route) => route.fulfill({
      contentType: "text/html", body: "<!doctype html><html><body></body></html>",
    }));
    await page.goto("./__package-acceptance.html");
    const installed = await page.evaluate(async (name) => {
      const modulePath = "/PangeaRSEdit/tests/fixtures/packageCustomObjectAcceptance.ts";
      const fixtureModule: typeof import("../fixtures/packageCustomObjectAcceptance") = await import(modulePath);
      const selected = fixtureModule.packageAcceptanceTargets.find((target) => target.name === name);
      if (!selected) return { error: "Unknown acceptance target", files: [] };
      const modelResponse = await fetch(`/PangeaRSEdit/${selected.model}`);
      if (!modelResponse.ok) return { error: "Model unavailable", files: [] };
      const model = Array.from(new Uint8Array(await modelResponse.arrayBuffer()));
      let skeleton: number[] | undefined;
      if (selected.skeleton) {
        const response = await fetch(`/PangeaRSEdit/${selected.skeleton}`);
        if (!response.ok) return { error: "Skeleton unavailable", files: [] };
        skeleton = Array.from(new Uint8Array(await response.arrayBuffer()));
      }
      const fixture = await fixtureModule.buildPackageAcceptanceFixture(selected, model, skeleton);
      return fixture.isErr() ? { error: fixture.error, files: [] } : { error: "", files: fixture.value.files };
    }, target.name);
    expect(installed.error).toBe("");
    expect(installed.files.length).toBeGreaterThan(0);
    await page.route("**/generated/pangea-ports/wasm/**/*.js", async (route) => {
      const response = await route.fetch();
      const loader = await response.text();
      const preload = `window.Module.preRun = [...(window.Module.preRun || []), function () {
        const files = ${JSON.stringify(installed.files)};
        const runtime = window.Module;
        // Bundled data must finish extracting before the archive replaces stock files.
        const initialized = runtime.onRuntimeInitialized;
        runtime.onRuntimeInitialized = function () {
          for (const file of files) {
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
    await page.goto(`generated/pangea-ports/wasm/${target.launch}`);
    await page.waitForFunction(() => window.Module?.calledRun === true && window.Module?.FS?.writeFile !== undefined, null, { timeout: 60_000 });
    if (target.start) await page.locator(target.start).click();
    await page.waitForFunction(() => window.Module?.ccall?.("PangeaScript_IsEnabled", "boolean", [], []) === true, null, { timeout: 30_000 });
    const mismatched = await page.evaluate((files) => files.filter((file) => {
      const actual = window.Module?.FS?.readFile?.(file.path);
      return !actual || actual.length !== file.bytes.length || actual.some((byte, index) => byte !== file.bytes[index]);
    }).map((file) => file.path), installed.files);
    expect(mismatched, "The imported package must survive native startup unchanged").toEqual([]);
    await test.info().attach("package-runtime-startup", { body: JSON.stringify({ messages, errors,
      inspector: await page.evaluate(() => window.Module?.ccall?.("PangeaScript_GetStatusInspectorJSON", "string", [], [])),
    }, null, 2), contentType: "application/json" });
    for (const milestone of ["spawned", "updated 30", "deleted"]) {
      await expect.poll(() => messages.some((message) => message.includes(`package acceptance ${milestone}`)), { timeout: 30_000 }).toBe(true);
    }
    expectNoLuaFailures(messages);
    expect(errors).toEqual([]);
    await test.info().attach("package-runtime-console", { body: JSON.stringify(messages, null, 2), contentType: "application/json" });
  });
}
