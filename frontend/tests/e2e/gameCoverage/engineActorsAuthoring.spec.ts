import { expect, test } from "@playwright/test";

test("a visually authored actor is available to the real Lua controller before level start", async ({ page }) => {
  test.skip(process.env.PANGEA_SANDBOX_RUNTIME_TEST !== "1", "Stage the engine runtime before running this acceptance test.");
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("pangea-feature-flags", JSON.stringify({ luaEngine: true })));
  await page.goto("#/engine");
  await page.getByLabel("Scene ID", { exact: true }).fill("authored");
  await page.getByLabel("Display name", { exact: true }).fill("Authored actors");
  await page.getByRole("button", { name: "Create scene + controller" }).click();
  await page.getByRole("combobox", { name: "Start scene", exact: true }).selectOption("authored");
  await page.getByRole("link", { name: "Edit levels", exact: true }).click();
  await page.getByRole("combobox", { name: "Scene", exact: true }).selectOption("scenes/authored.json");
  await page.getByRole("button", { name: "Add actor", exact: true }).click();
  await page.getByLabel("Actor position X", { exact: true }).fill("225");
  await page.getByLabel("Physics body", { exact: true }).check();
  await page.getByRole("combobox", { name: "Body movement", exact: true }).selectOption("static");
  await expect(page.getByRole("button", { name: "Select actor actor1", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Package & scripts", exact: true }).click();
  await page.getByRole("button", { name: "scenes/authored.lua", exact: true }).click();
  const source = page.getByRole("textbox", { name: "Package source", exact: true });
  await expect(source).toBeVisible({ timeout: 30_000 });
  await source.press("ControlOrMeta+A");
  await page.keyboard.insertText(`local engine=require('engine')
local p=require('pangea')
return {onLevelStart=function()
 local actor=assert(engine.entity('actor1'),'Authored actor missing')
 assert(p.object.position(actor).x==225,'Authored transform missing')
 assert(engine.bodyInfo(actor).mode=='static','Authored body missing')
 assert(engine.saveSnapshot('browser-checkpoint',{integrity=73}).ok,'Checkpoint save failed')
 assert(p.object.setPositionResult(actor,{x=900,y=100,z=900}).ok)
 local restored=engine.loadSnapshot('browser-checkpoint')
 assert(restored.ok,restored.message)
 assert(restored.controllerState.integrity==73,'Controller state missing')
 assert(not p.object.exists(actor),'Old actor handle survived restore')
 actor=assert(engine.entity('actor1'),'Restored actor missing')
 assert(p.object.position(actor).x==225,'Checkpoint transform missing')
 assert(engine.ui({title='Authored actor loaded',widgets={{id='ready',type='text',text='Lua found the visual actor and restored its checkpoint'}}}).ok)
end}
`);
  await expect(page.getByRole("button", { name: "Run changes", exact: true })).toBeEnabled({ timeout: 60_000 });
  await page.getByRole("button", { name: "Run changes", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Preview updated.");
  await page.getByRole("combobox", { name: "Preview scene", exact: true }).selectOption("authored");
  const preview = page.frameLocator('iframe[title="Lua engine preview"]');
  await expect(preview.getByRole("heading", { name: "Authored actor loaded", exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(preview.getByText("Lua found the visual actor and restored its checkpoint", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).not.toContainText("Authored actor missing");
});
