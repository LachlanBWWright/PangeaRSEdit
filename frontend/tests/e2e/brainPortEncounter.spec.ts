import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { expectNoLuaFailures, runtimeHealth, runtimeInspector, runtimeObjectDefinition, runtimeObjects } from "./scriptRuntimeHealth";
import { launchOttoPackage } from "./scriptPackageRuntime";

const recordings = new WeakMap<Page, {messages:string[];errors:string[]}>();
test.afterEach(async ({page}, info) => {
  const recorded = recordings.get(page);
  if (!recorded || page.isClosed()) return;
  const snapshot = await page.evaluate(() => window.Module?.ccall?.("PangeaScript_GetStatusInspectorJSON","string",[],[]) ?? null);
  const diagnostics = info.outputPath("brain-port-encounter.json");
  await writeFile(diagnostics, JSON.stringify({...recorded,snapshot},null,2));
  await info.attach("brain-port-encounter", {path:diagnostics,contentType:"application/json"});
});

test("two exported Brain Ports preserve overrides through checkpoint reset and area reentry", async ({ page }) => {
  test.setTimeout(180_000);
  const messages: string[] = [];
  const errors: string[] = [];
  recordings.set(page, {messages,errors});
  page.on("console", (message) => messages.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/__encounter.html", (route) => route.fulfill({contentType:"text/html",body:"<!doctype html><html><body></body></html>"}));
  await page.goto("./__encounter.html");
  const installed = await page.evaluate(async () => {
    const modulePath = "/PangeaRSEdit/tests/fixtures/brainPortEncounter.ts";
    const fixture: typeof import("../fixtures/brainPortEncounter") = await import(modulePath);
    const response = await fetch("/PangeaRSEdit/games/ottomatic/models/level10_brainboss.bg3d");
    if (!response.ok) return {error:"Brain Port model unavailable",files:[],placements:[]};
    const built = await fixture.buildBrainPortEncounter(Array.from(new Uint8Array(await response.arrayBuffer())));
    return built.isErr() ? {error:built.error,files:[],placements:[]} : {error:"",...built.value};
  });
  expect(installed.error).toBe("");
  expect(installed.placements).toHaveLength(2);
  expect(installed.placements.map((placement) => placement.parameterOverrides?.spawnInterval)).toEqual([0.2,0.7]);
  await launchOttoPackage(page, installed.files);
  const state = async () => (await runtimeInspector(page))?.objects
    .find((object) => runtimeObjectDefinition(object) === "custom.encounter-observer")?.state;
  await expect.poll(state, {timeout:60_000}).toMatchObject({phase:"checkpoint-ready",independentOverrides:"true"});
  expect(await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeDeathJS","number",[],[]))).toBe(1);
  await expect.poll(state, {timeout:60_000}).toMatchObject({phase:"complete",resets:"1",
    checkpointRestart:"true",checkpointPreserve:"true",timersRestarted:"true",leftArea:"true",
    freshHandles:"true",deletionIsolated:"true",cleaned:"true"});
  expect((await runtimeObjects(page)).filter((object) => runtimeObjectDefinition(object) === "custom.brain-port" || object.state.origin === "independent-brain-port")).toEqual([]);
  expect((await runtimeInspector(page))?.runtime).toMatchObject({timers:0,tasks:0,subscriptions:0});
  expect(await runtimeHealth(page)).toMatchObject({enabled:true,scriptsDisabled:false,errorCount:0,budgetExceeded:0,lastError:""});
  expectNoLuaFailures(messages);
  expect(errors).toEqual([]);
});
