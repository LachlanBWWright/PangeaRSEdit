// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Result } from "neverthrow";
import { OttoGlobals, BugdomGlobals } from "@/data/globals/globals";
import { createNativeActorVariant, nativeActorChoices } from "./scriptNativeActorVariants";
import { buildScriptPackageZip, compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace, importScriptPackageZip } from "./scriptWorkspaceState";

describe("native enemy variants", () => {
  it("offers exactly the actors whose native adapter declares constructor requirements", () => {
    const native = Result.fromThrowable(() => readFileSync(resolve(process.cwd(), "../games/pangea-ports/games/OttoMatic-Android/src/Scripting/ScriptBindings.c"), "utf8"), String)();
    expect(native.isOk()).toBe(true);
    if (native.isErr()) return;
    const types = [...native.value.matchAll(/\.actorRequirements =[^\n]+\n\s*\.nativeType = (\d+)/g)].map((match) => match[1]).sort();
    expect(types.length).toBeGreaterThan(0);
    const choices = nativeActorChoices(createScriptWorkspaceContext(OttoGlobals, 0));
    expect(choices.map((entry) => entry.id).sort()).toEqual(types);
  });
  it("creates an independent variant that preserves native combat until an override is enabled", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const base = ensureScriptWorkspace({}, context);
    const corn = nativeActorChoices(context).find((entry) => entry.id === "9");
    expect(corn).toBeDefined();
    if (!corn) return;
    const result = createNativeActorVariant(base, "Armoured corn", corn.id);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const definition = result.value.state.customObjects.find((entry) => entry.id === result.value.id);
    expect(definition?.visual).toEqual({ kind: "nativeActor", spawnId: corn.id, scale: 1 });
    expect(definition?.controllerOwnership).toBe("native");
    expect(definition?.collision).toEqual({ kind: "none" });
    expect(definition?.parameterDefinitions).toContainEqual({ id: "overrideHealth", label: "Override health", kind: "boolean", defaultValue: false });
    const source = definition && result.value.state.sourceFiles[definition.sourceFilePath]?.content;
    expect(source).toContain("setHealthResult");
    expect(source).not.toContain("setScriptControlled");
    expect(base.customObjects).toHaveLength(0);
  });

  it("rejects unsupported games and unknown constructors", () => {
    const context = createScriptWorkspaceContext(BugdomGlobals, 0);
    expect(nativeActorChoices(context)).toEqual([]);
    expect(createNativeActorVariant(ensureScriptWorkspace({}, context), "Enemy", "9").isErr()).toBe(true);
    const otto = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
    expect(createNativeActorVariant(otto, "Enemy", "missing").isErr()).toBe(true);
  });

  it("keeps native constructor identity in runnable configuration and package round trips", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const corn = nativeActorChoices(context).find((entry) => entry.id === "9");
    expect(corn).toBeDefined();
    if (!corn) return;
    const created = createNativeActorVariant(ensureScriptWorkspace({}, context), "Corn guard", corn.id);
    if (created.isErr()) return;
    const compiled = compileScriptWorkspace(created.value.state);
    expect(compiled.isOk()).toBe(true);
    const archive = await buildScriptPackageZip(created.value.state);
    expect(archive.isOk()).toBe(true);
    if (archive.isErr()) return;
    const restored = importScriptPackageZip(archive.value, context);
    expect(restored.isOk()).toBe(true);
    if (restored.isErr()) return;
    expect(restored.value.customObjects[0]?.visual).toEqual({ kind: "nativeActor", spawnId: corn.id, scale: 1 });
    expect(restored.value.customObjects[0]?.controllerOwnership).toBe("native");
  });
});
