import { expect, test, type Page } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ResultAsync } from "neverthrow";

async function openValidationPage(page: Page): Promise<void> {
  await page.route("**/lua-validation-test", (route) => route.fulfill({
    contentType: "text/html", body: "<!doctype html><title>Lua validation acceptance</title>",
  }));
  await page.goto("./lua-validation-test");
}

const entryPath = "Data/Scripts/dist/modules/objects/actor.lua";
const cases = [
  { name: "Lua 5.4 syntax", source: "local n <const> = (7 << 2) | 1; assert(n == 29 and 7 // 2 == 3); return { Actor = {} }", phase: undefined },
  { name: "malformed source", source: "local broken = )\nreturn { Actor = {} }", phase: "syntax" },
  { name: "missing bundled module", source: 'return { Actor = require("missing.helper") }', phase: "module" },
  { name: "invalid behavior export", source: "return { Actor = 42 }", phase: "export" },
  { name: "native call during initialization", source: "pangea.object.delete({}); return { Actor = {} }", phase: "module" },
];

for (const fixture of cases) {
  test(`production Lua validation worker handles ${fixture.name}`, async ({ page }) => {
    await openValidationPage(page);
    const outcome = await page.evaluate(async ({ source, entryPath }) => {
      const modulePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptLuaValidation.ts";
      const validation: typeof import("../../src/editor/subviews/scripts/scriptLuaValidation") = await import(modulePath);
      const result = await validation.validateLuaWorkspace({
        modules: [{ path: entryPath, source }],
        behaviors: [{ modulePath: entryPath, exportName: "Actor" }],
      });
      return result.isOk() ? { ok: true, diagnostics: [] } : { ok: false, diagnostics: result.error };
    }, { source: fixture.source, entryPath });
    expect(outcome.ok, JSON.stringify(outcome.diagnostics)).toBe(fixture.phase === undefined);
    if (fixture.phase) expect(outcome.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ phase: fixture.phase, filePath: entryPath }),
    ]));
  });
}

test("production validation terminates uninterruptible Lua work and recovers", async ({ page }) => {
  await openValidationPage(page);
  const outcome = await page.evaluate(async (entryPath) => {
    const modulePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptLuaValidation.ts";
    const validation: typeof import("../../src/editor/subviews/scripts/scriptLuaValidation") = await import(modulePath);
    const started = performance.now();
    // Lua's C pattern matcher cannot be interrupted by a Lua instruction hook.
    const stalled = await validation.validateLuaWorkspace({
      modules: [{ path: entryPath, source: `string.match(string.rep("a", 50000), "a*a*a*a*a*a*a*a*a*b"); return { Actor = {} }` }],
      behaviors: [{ modulePath: entryPath, exportName: "Actor" }],
    });
    const elapsed = performance.now() - started;
    const recovered = await validation.validateLuaWorkspace({
      modules: [{ path: entryPath, source: "return { Actor = {} }" }],
      behaviors: [{ modulePath: entryPath, exportName: "Actor" }],
    });
    return { elapsed, diagnostics: stalled.isErr() ? stalled.error : [], recovered: recovered.isOk() };
  }, entryPath);
  expect(outcome.elapsed).toBeGreaterThanOrEqual(4_900);
  expect(outcome.elapsed).toBeLessThan(12_000);
  expect(outcome.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ phase: "engine", message: expect.stringContaining("timed out") }),
  ]));
  expect(outcome.recovered).toBe(true);
});

test("caught instruction-budget errors cannot block subsequent validation", async ({ page }) => {
  await openValidationPage(page);
  const outcome = await page.evaluate(async (entryPath) => {
    const modulePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptLuaValidation.ts";
    const validation: typeof import("../../src/editor/subviews/scripts/scriptLuaValidation") = await import(modulePath);
    const caught = await validation.validateLuaWorkspace({
      modules: [{ path: entryPath, source: "while true do pcall(function() for i=1,100000000 do end end) end" }],
      behaviors: [],
    });
    const recovered = await validation.validateLuaWorkspace({
      modules: [{ path: entryPath, source: "return {}" }], behaviors: [],
    });
    return { rejected: caught.isErr(), diagnostics: caught.isErr() ? caught.error : [], recovered: recovered.isOk() };
  }, entryPath);
  expect(outcome.rejected).toBe(true);
  expect(outcome.diagnostics.some((finding) => /budget|timed out/i.test(finding.message))).toBe(true);
  expect(outcome.recovered).toBe(true);
});

test("production compile and package export reject invalid Lua then accept corrected source", async ({ page }) => {
  await openValidationPage(page);
  const outcome = await page.evaluate(async () => {
    const workspacePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
    const globalsPath = "/PangeaRSEdit/src/data/globals/globals.ts";
    const workspace: typeof import("../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(workspacePath);
    const globals: typeof import("../../src/data/globals/globals") = await import(globalsPath);
    const initial = workspace.ensureScriptWorkspace({}, workspace.createScriptWorkspaceContext(globals.OttoGlobals, 1));
    const invalid = workspace.upsertScriptSourceFile(initial, "Data/Scripts/src/objects/actor.lua", "local broken = )");
    const compile = await workspace.compileScriptWorkspaceAsync(invalid);
    const rejectedPackage = await workspace.buildScriptPackageFiles(invalid);
    const corrected = workspace.upsertScriptSourceFile(invalid, "Data/Scripts/src/objects/actor.lua", "return {}");
    const acceptedPackage = await workspace.buildScriptPackageFiles(corrected);
    return {
      compileRejected: compile.isErr(),
      diagnostics: compile.isErr() ? compile.error.diagnostics : [],
      packageRejected: rejectedPackage.isErr(),
      packageAccepted: acceptedPackage.isOk(),
      packageError: acceptedPackage.isErr() ? acceptedPackage.error : "",
    };
  });
  expect(outcome.compileRejected).toBe(true);
  expect(outcome.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ category: "source-validation", filePath: "Data/Scripts/src/objects/actor.lua", severity: "error" }),
  ]));
  expect(outcome.packageRejected).toBe(true);
  expect(outcome.packageAccepted, outcome.packageError).toBe(true);
});

test("bundled production worker loads its emitted WASM and validates Lua", async ({ page }) => {
  const assetsPath = join(process.cwd(), "dist-desktop/assets");
  const listing = await ResultAsync.fromPromise(readdir(assetsPath), () => "Build desktop assets before this test.");
  expect(listing.isOk()).toBe(true);
  if (listing.isErr()) return;
  const workerName = listing.value.find((name) => /^scriptLuaValidation\.worker-.*\.js$/.test(name));
  expect(workerName).toBeDefined();
  if (!workerName) return;
  await page.route("**/assets/*", async (route) => {
    const name = new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    if (!listing.value.includes(name)) return route.continue();
    const file = await ResultAsync.fromPromise(readFile(join(assetsPath, name)), () => "Could not read emitted asset.");
    if (file.isErr()) return route.abort();
    return route.fulfill({ body: file.value, contentType: name.endsWith(".wasm") ? "application/wasm" : "text/javascript" });
  });
  await openValidationPage(page);
  const outcome = await page.evaluate(async ({ workerName, entryPath }) => {
    const typesPath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptLuaValidationTypes.ts";
    const types: typeof import("../../src/editor/subviews/scripts/scriptLuaValidationTypes") = await import(typesPath);
    const response = await new Promise<unknown>((resolve) => {
      const worker = new Worker(`/assets/${workerName}`, { type: "module" });
      const finish = (data: unknown) => { clearTimeout(timeout); worker.terminate(); resolve(data); };
      const timeout = setTimeout(() => finish({ error: "Bundled worker timed out" }), 10_000);
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const parsed = types.luaValidationResponseSchema.safeParse(event.data);
        if (parsed.success) finish(parsed.data);
      };
      worker.onerror = () => finish({ error: "Bundled worker failed" });
      worker.postMessage({
        modules: [{ path: entryPath, source: "local n <const> = 3 // 2; assert(n == 1); return { Actor = {} }" }],
        behaviors: [{ modulePath: entryPath, exportName: "Actor" }],
      });
    });
    const parsed = types.luaValidationResponseSchema.safeParse(response);
    return parsed.success ? parsed.data : { ok: false, diagnostics: response };
  }, { workerName, entryPath });
  expect(outcome).toEqual({ ok: true });
});
