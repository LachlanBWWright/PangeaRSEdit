import { expect, test } from "@playwright/test";
import { launchOttoPackage } from "./scriptPackageRuntime";
import { runtimeHealth, runtimeObjects } from "./scriptRuntimeHealth";

test("level-scoped Lua selects a clear route, flies a transport and releases a deployed native alien", async ({ page }) => {
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await page.route("**/__transport.html", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
  await page.goto("./__transport.html");
  const installed = await page.evaluate(async () => {
    const samplePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptTransportSample.ts";
    const workspacePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
    const sample: typeof import("../../src/editor/subviews/scripts/scriptTransportSample") = await import(samplePath);
    const workspace: typeof import("../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(workspacePath);
    const created = sample.createEarthFarmTransportWorkspace();
    if (created.isErr()) return { error: created.error, files: [] };
    const probePath = "Data/Scripts/src/transport-observer.lua";
    const probe = `local p=require('pangea'); return {onFrame=function()
      p.player.setHealthResult(0,1)
      for _, handle in ipairs(p.object.all()) do
        local state=p.object.state(handle)
        if state.origin=='scripted-saucer-deployment' then
          state.nativeControl=not p.object.scriptControlled(handle)
          local position=p.object.position(handle)
          local terrain=p.world.sampleTerrain(position.x,position.z)
          if p.object.scriptControlled(handle) and terrain and position.y-terrain.height>400 then
            state.observedAirborne=true
          end
        end
      end
    end}`;
    const configured = workspace.setScriptSourceExecutionScope(workspace.upsertScriptSourceFile(created.value, probePath, probe), probePath, "game");
    const files = await workspace.buildScriptPackageFilesAsync(configured);
    return files.isErr() ? { error: files.error, files: [] } : { error: "", files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) };
  });
  expect(installed.error).toBe("");
  await launchOttoPackage(page, installed.files);
  await expect.poll(async () => (await runtimeObjects(page)).some((object) => object.type === "custom.transport-top"), { timeout: 45_000, message: "transport approach" }).toBe(true);
  await expect.poll(async () => (await runtimeObjects(page)).some((object) => object.type === "custom.transport-beam"), { timeout: 45_000, message: "transport beam" }).toBe(true);
  await expect.poll(async () => (await runtimeObjects(page)).find((object) => object.state.origin === "scripted-saucer-deployment")?.state,
    { timeout: 45_000, message: "native alien handoff" }).toMatchObject({ nativeControl: "true", observedAirborne: "true" });
  expect(await runtimeHealth(page), messages.join("\n")).toMatchObject({ errorCount: 0, lastError: "" });
});
