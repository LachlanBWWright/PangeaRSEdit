import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { NanosaurGlobals, OttoGlobals, CroMagGlobals, MightyMikeGlobals } from "@/data/globals/globals";
import { createObjectDefinition, deleteObjectDefinition } from "./scriptObjectActions";
import { changeObjectVisual } from "./scriptObjectVisuals";
import {
  addScriptAsset, applyGlobalBehavior, compileScriptWorkspace, createScriptWorkspaceContext,
  ensureScriptWorkspace, placeCustomObject, removeGlobalAssignment, retargetScriptWorkspace,
  updateCustomObjectDefinition, upsertScriptSourceFile,
} from "./scriptWorkspaceState";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { AUTHORITATIVE_API_SCHEMA } from "./scriptApiSchema";
import { addObjectHandler } from "./scriptObjectHandlers";

describe("scripting workbench", () => {
  it("creates distinct object definitions and keeps their Lua exports aligned", () => {
    const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0));
    for (const starter of ["blank", "sample.hover-beacon"]) {
      const result = createObjectDefinition(state, "Checkpoint lantern", starter);
      expect(result.isOk()).toBe(true);
      if (result.isErr()) return;
      const definition = result.value.state.customObjects[0];
      expect(definition).toBeDefined();
      if (!definition) return;
      expect(result.value.state.sourceFiles[definition.sourceFilePath]?.content).toContain(`${definition.exportName} =`);
      const another = createObjectDefinition(result.value.state, "Checkpoint lantern", starter);
      expect(another.isOk()).toBe(true);
      if (another.isErr()) return;
      expect(another.value.id).not.toBe(result.value.id);
      expect(another.value.state.customObjects).toHaveLength(2);
    }
  });

  it("starts a new level without copying assignments and preserves another level's shared source", () => {
    const first = createScriptWorkspaceContext(OttoGlobals, 0);
    const second = createScriptWorkspaceContext(OttoGlobals, 1);
    const initial = applyGlobalBehavior(ensureScriptWorkspace({}, first), "onLevelStart", "sample.log-level-start");
    const source = initial.levels["0"]?.globalHooks[0]?.sourceFilePath;
    const other = retargetScriptWorkspace(initial, second);
    expect(other.levels["1"]?.globalHooks).toEqual([]);
    const assigned = applyGlobalBehavior(other, "onLevelStart", "sample.log-level-start");
    const assignment = assigned.levels["1"]?.globalHooks[0];
    if (!assignment || !source) return;
    const removed = removeGlobalAssignment(assigned, assignment.id);
    expect(removed.levels["0"]?.globalHooks).toHaveLength(1);
    expect(removed.levels["1"]?.globalHooks).toHaveLength(0);
    expect(removed.sourceFiles[source]).toBeDefined();
    expect(compileScriptWorkspace(removed).isOk()).toBe(true);
  });

  it("uses contract hook availability, including dialogue and damage, without advertising unsupported race hooks", () => {
    for (const globals of [OttoGlobals, NanosaurGlobals, CroMagGlobals, MightyMikeGlobals]) {
      const context = createScriptWorkspaceContext(globals, 0);
      const native = AUTHORITATIVE_API_SCHEMA.games.find((game) => game.gameId === context.gameId);
      expect(context.supportedHooks).toEqual(native?.supportedHooks);
      expect(context.supportedHooks).toContain("onDialogueResult");
      expect(context.supportedHooks).toContain("onDamage");
    }
    expect(createScriptWorkspaceContext(CroMagGlobals, 0).supportedHooks).not.toContain("onWeaponHit");
  });

  it("round-trips physical skeleton resources and recursive helper dependencies", () => {
    const context = createScriptWorkspaceContext(NanosaurGlobals, 0);
    const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Lantern", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const definition = created.value.state.customObjects[0];
    if (!definition) { expect.fail("Missing definition"); return; }
    let state = updateCustomObjectDefinition(created.value.state, changeObjectVisual(definition, "customSkeleton", context.gameId));
    state = addScriptAsset(state, "Data/Scripts/assets/skeletons/custom.3dmf", new Uint8Array([1]), "model");
    state = addScriptAsset(state, "Data/Scripts/assets/skeletons/custom.skeleton.rsrc", new Uint8Array([2]), "skeleton");
    state = upsertScriptSourceFile(state, definition.sourceFilePath, `local helper = require("helpers.glow")\nreturn { ${definition.exportName} = helper }`);
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/glow.lua", 'local math = require("helpers.math")\nreturn {}');
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/math.lua", 'local glow = require("helpers.glow")\nreturn {}');
    const zipped = buildScriptDefinitionBundle(state);
    expect(zipped.isOk()).toBe(true);
    if (zipped.isErr()) return;
    const imported = importScriptDefinitionBundle(zipped.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(Object.keys(imported.value.sources)).toHaveLength(3);
    expect(imported.value.assets["Data/Scripts/assets/skeletons/custom.skeleton.rsrc"]).toEqual(new Uint8Array([2]));
    expect(imported.value.assets["Data/Scripts/assets/skeletons/custom.3dmf"]).toEqual(new Uint8Array([1]));
  });

  it("rejects definition bundles with paths outside source and assets", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const bytes = zipSync({ "manifest.json": strToU8(JSON.stringify({ schemaVersion: 1, gameId: context.gameId, definitions: [], sourcePaths: ["Data/Scripts/src/../../escape.lua"], assetPaths: [] })) });
    expect(importScriptDefinitionBundle(bytes, context).isErr()).toBe(true);
  });

  it("adds lifecycle handlers and prevents deleting referenced definitions", () => {
    const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
    const created = createObjectDefinition(state, "Lantern", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const definition = created.value.state.customObjects[0];
    if (!definition) return;
    const withHandler = addObjectHandler(created.value.state, definition, "onDestroy");
    expect(withHandler.isOk()).toBe(true);
    if (withHandler.isErr()) return;
    expect(withHandler.value.sourceFiles[definition.sourceFilePath]?.content).toContain("function object.onDestroy(self, ctx)");
    const placed = placeCustomObject(withHandler.value, definition.id, definition.label, { x: 1, y: 2, z: 3 });
    expect(deleteObjectDefinition(placed, definition.id).customObjects).toHaveLength(1);
    expect(deleteObjectDefinition(withHandler.value, definition.id).customObjects).toHaveLength(0);
  });
});
