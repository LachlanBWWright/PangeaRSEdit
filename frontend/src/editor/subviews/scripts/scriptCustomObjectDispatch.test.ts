import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "@/data/globals/globals";
import {
  compileScriptWorkspace,
  createScriptWorkspaceContext,
  loadScriptSample,
  upsertScriptSourceFile,
} from "./scriptWorkspaceState";

const luaBinary = process.env["PANGEA_SCRIPT_LUA_BIN"];

describe("custom item gameplay dispatch", () => {
  it.skipIf(luaBinary === undefined)("executes item-local results through the exported Lua entrypoint", () => {
    if (luaBinary === undefined) return;
    const context = createScriptWorkspaceContext(Bugdom2Globals, 1);
    let workspace = loadScriptSample(context, "hover-beacon");
    const definition = workspace.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    workspace = upsertScriptSourceFile(workspace, definition.sourceFilePath, [
      "local item = {}",
      "function item.onTrigger(self, ctx)",
      "  assert(self.handle == ctx.self)",
      "  return { handled = true, solid = false, damagePlayer = 0.25 }",
      "end",
      "function item.onPickupCollected(self, ctx)",
      "  assert(self.handle == ctx.pickup)",
      "  return { handled = true, consumePickup = true, healthDelta = 0.2, scoreDelta = 7 }",
      "end",
      "function item.onWeaponHit(self, ctx)",
      "  assert(self.handle == ctx.target)",
      "  return { handled = true, applyDamage = false, destroyTarget = true }",
      "end",
      "function item.onDamage(self, ctx)",
      "  assert(self.handle == ctx.target)",
      "  return { handled = true, applyDamage = false, damage = 0 }",
      "end",
      "function item.onDamageApplied(self, ctx)",
      "  assert(self.handle == ctx.target)",
      "  damageNotifications = damageNotifications + 1",
      "end",
      "function item.onTriggerEnter(self, ctx)",
      "  assert(self.handle == ctx.object)",
      "  contactNotifications = contactNotifications + 1",
      "end",
      "function item.onDeath(self, ctx)",
      "  assert(self.handle == ctx.object)",
      "  deathNotifications = deathNotifications + 1",
      "end",
      `return { ${definition.exportName} = item }`,
    ].join("\n"));
    const compiled = compileScriptWorkspace(workspace);
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    const entry = compiled.value.compiledFiles["Data/Scripts/dist/main.lua"];
    expect(entry).toBeDefined();
    if (!entry) return;
    const modules = Object.values(compiled.value.sourceFiles)
      .filter((source) => source.role !== "generated-entry")
      .map((source) => {
        const name = source.path.replace(/^Data\/Scripts\/src\//, "").replace(/\.lua$/, "").replaceAll("/", ".");
        return `package.preload[${JSON.stringify(name)}] = function()\n${source.content}\nend`;
      });
    const harness = [
      "contactNotifications = 0; damageNotifications = 0; deathNotifications = 0",
      `pangea = { object = { type = function(handle) if handle.id == 1 then return ${JSON.stringify(definition.id)} end return 'native.other' end } }`,
      "package.preload['pangea'] = function() return pangea end",
      ...modules,
      `local entry = (function()\n${entry.content}\nend)()`,
      "local handle = { id = 1, generation = 1 }",
      "local trigger = entry.onTriggerEnter({ self = handle, playerNum = 0 })",
      "assert(trigger.handled and trigger.solid == false and trigger.damagePlayer == 0.25)",
      "assert(contactNotifications == 0)",
      `entry.onObjectFrame({ object = handle, objectType = ${JSON.stringify(definition.id)}, event = 'triggerEnter' })`,
      "assert(contactNotifications == 1)",
      `entry.onObjectFrame({ object = handle, objectType = ${JSON.stringify(definition.id)}, event = 'death' })`,
      "assert(deathNotifications == 1)",
      "local pickup = entry.onPickupCollected({ pickup = handle })",
      "assert(pickup.handled and pickup.consumePickup and pickup.healthDelta == 0.2 and pickup.scoreDelta == 7)",
      "local hit = entry.onWeaponHit({ target = handle, damage = 0.5 })",
      "assert(hit.handled and hit.applyDamage == false and hit.destroyTarget)",
      "local damage = entry.onDamage({ target = handle, damage = 0.5 })",
      "assert(damage.handled and damage.applyDamage == false and damage.damage == 0)",
      "entry.onDamageApplied({ target = handle })",
      "assert(damageNotifications == 1)",
      "local other = entry.onTriggerEnter({ self = { id = 2, generation = 1 } })",
      "assert(not other.handled and other.solid == nil and other.damagePlayer == 0)",
      "print('Custom gameplay dispatch passed')",
    ].join("\n");
    const execution = Result.fromThrowable(
      () => execFileSync(luaBinary, ["-"], { input: harness, encoding: "utf8" }),
      () => "Generated custom item Lua failed to execute",
    )();
    expect(execution.isOk()).toBe(true);
    if (execution.isOk()) expect(execution.value).toContain("Custom gameplay dispatch passed");
  });
});
