import { test, expect } from "./desktopFixture.ts";
import { builtLuaValidationWorker, runRendererLuaWorker, validationInput } from "./luaValidationWorkerFixture.ts";

test("production Lua 5.4 worker and WASM load through Electron's application protocol and CSP", async ({ desktop }) => {
  const worker = await builtLuaValidationWorker();
  expect(worker.isErr() ? worker.error : null).toBeNull();
  if (worker.isErr()) return;
  expect(desktop.page.url()).toMatch(/^pangea:\/\/editor\//);
  const policy = await desktop.page.evaluate(async () => {
    const response = await fetch(window.location.href);
    return response.headers.get("Content-Security-Policy");
  });
  expect(policy).toContain("worker-src 'self' blob:");
  expect(policy).toContain("'wasm-unsafe-eval'");
  const validated = await runRendererLuaWorker(desktop.page, worker.value, validationInput(`
local mask <const> = (7 << 2) | 1
local resource <close> = setmetatable({}, { __close = function() end })
assert(mask == 29 and 7 // 2 == 3 and (mask & 1) == 1)
return { Actor = { onSpawn = function() end } }
`));
  expect(validated.isErr() ? validated.error : null).toBeNull();
  if (validated.isErr()) return;
  expect(validated.value).toEqual({ response: { ok: true }, ready: true, terminated: true });
});

test("Electron worker reports syntax and native initialization errors, terminates and recovers cleanly", async ({ desktop }) => {
  const worker = await builtLuaValidationWorker();
  expect(worker.isErr() ? worker.error : null).toBeNull();
  if (worker.isErr()) return;
  const cases = [
    { source: "local good = 1\nlocal broken = )\nreturn { Actor = {} }", phase: "syntax", line: 2 },
    { source: "pangea.object.delete({})\nreturn { Actor = {} }", phase: "module" },
    { source: "while true do end\nreturn { Actor = {} }", phase: "module" },
    { source: '_G.validation_poison = 42\nerror("stop")\nreturn { Actor = {} }', phase: "module" },
  ];
  for (const entry of cases) {
    const invalid = await runRendererLuaWorker(desktop.page, worker.value, validationInput(entry.source));
    expect(invalid.isErr() ? invalid.error : null).toBeNull();
    if (invalid.isErr()) return;
    expect(invalid.value.ready).toBe(true);
    expect(invalid.value.terminated).toBe(true);
    expect(invalid.value.response.ok).toBe(false);
    if (!invalid.value.response.ok) expect(invalid.value.response.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: "Data/Scripts/dist/modules/objects/actor.lua", phase: entry.phase,
        ...(entry.line ? { line: entry.line } : {}) }),
    ]));
  }
  const recovered = await runRendererLuaWorker(desktop.page, worker.value, validationInput(`
assert(validation_poison == nil)
local remove = pangea.object.delete
return { Actor = { onSpawn = function(self) return remove(self.handle) end } }
`));
  expect(recovered.isErr() ? recovered.error : null).toBeNull();
  if (recovered.isErr()) return;
  expect(recovered.value).toEqual({ response: { ok: true }, ready: true, terminated: true });
});
