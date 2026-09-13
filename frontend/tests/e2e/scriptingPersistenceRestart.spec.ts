import { expect, test } from "@playwright/test";

test("Otto Matic persistence survives a generated WASM reload", async ({ page }) => {
  test.setTimeout(210_000);
  const storageKey = `pangea-persistence-restart-${Date.now()}`;
  const consoleMessages: string[] = [];
  page.on("console", (message) => consoleMessages.push(message.text()));

  await page.addInitScript(({ key }) => {
    const phase = window.localStorage.getItem(key) === "seeded" ? "verify" : "seed";
    window.localStorage.setItem(key, "seeded");
    const script = phase === "seed"
      ? `local pangea = require("pangea")
local entry = {}
local checked = false
function entry.onFrame(ctx)
  if not checked then
    assert(pangea.api.capabilities().persistence == true, "persistence capability missing")
    assert(pangea.persistence.set("browser-restart", 1, "durable"), "persistence seed failed")
    pangea.log.info("browser persistence seeded")
    checked = true
  end
end
return entry
`
      : `local pangea = require("pangea")
local entry = {}
local checked = false
function entry.onFrame(ctx)
  if not checked then
    assert(pangea.persistence.get("browser-restart", 1) == "durable", "persistence was not restored")
    assert(pangea.persistence.delete("browser-restart"), "persistence cleanup failed")
    pangea.log.info("browser persistence restored")
    checked = true
  end
end
return entry
`;
    window.Module = {
      canvas: document.createElement("canvas"),
      arguments: [],
      locateFile: (path: string) => path,
      preRun: [function () {
        const runtime = window.Module;
        if (!runtime?.FS?.writeFile) return;
        for (const path of ["/Data/Scripts", "/Data/Scripts/dist", "/Data/Scripts/config"]) {
          if (runtime.FS.analyzePath?.(path).exists) continue;
          runtime.FS.mkdir?.(path);
        }
        runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode(script));
      }],
    };
  }, { key: storageKey });

  await page.goto("generated/pangea-ports/wasm/ottomatic/OttoMatic.html?level=0");
  await expect.poll(
    () => consoleMessages.some((message) => message.includes("browser persistence seeded")),
    { timeout: 90_000 },
  ).toBe(true);

  await page.reload();
  await expect.poll(
    () => consoleMessages.some((message) => message.includes("browser persistence restored")),
    { timeout: 90_000 },
  ).toBe(true);
});
