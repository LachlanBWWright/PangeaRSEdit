import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { bg3dParsedToGLTF } from "@/modelParsers/parsedBg3dGitfConverter";
import { parseUploadedObjectModel, convertUploadedModel } from "./scriptUploadedModel";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { validateParsedNativeModel, validateScriptWorkspaceAssets } from "./scriptAssetValidation";
import { createScriptWorkspaceContext, loadScriptSample } from "./scriptWorkspaceState";
import { BugdomGlobals, OttoGlobals } from "@/data/globals/globals";

const fixtures = [
  ["ottomatic", "Blob.bg3d", "Blob.skeleton.rsrc"],
  ["bugdom1", "FireFly.3dmf", "FireFly.skeleton.rsrc"],
  ["bugdom2", "Mouse.bg3d", "Mouse.skeleton.rsrc"],
  ["nanosaur1", "Rex.3dmf", "Rex.skeleton.rsrc"],
  ["nanosaur2", "bonusworm.bg3d", "bonusworm.skeleton.rsrc"],
  ["cromagrally", "GragStanding.bg3d", "GragStanding.skeleton.rsrc"],
  ["billyfrontier", "Billy.bg3d", "Billy.skeleton.rsrc"],
] satisfies readonly (readonly [string, string, string])[];

function asset(path: string, bytes: Uint8Array) {
  return { path, bytes, sourceName: path };
}

function fixtureAssets(game: string, model: string, skeleton: string): ScriptWorkspaceState["assets"] {
  const modelPath = `Data/Scripts/assets/${model}`;
  const skeletonPath = `Data/Scripts/assets/${skeleton}`;
  return {
    [modelPath]: asset(modelPath, new Uint8Array(readFileSync(join(__dirname, "../../../../public/games", game, "skeletons", model)))),
    [skeletonPath]: asset(skeletonPath, new Uint8Array(readFileSync(join(__dirname, "../../../../public/games", game, "skeletons", skeleton)))),
  };
}

describe("uploaded collision model loading", () => {
  it.each(["ottomatic/models/global.bg3d", "bugdom1/models/Global_Models1.3dmf"])("selects and validates an individual native object from %s", async (file) => {
    const path = `Data/Scripts/assets/models/bank.${file.endsWith("3dmf") ? "3dmf" : "bg3d"}`;
    const assets = { [path]: asset(path, new Uint8Array(readFileSync(join(__dirname, "../../../../public/games", file)))) };
    const parsed = await parseUploadedObjectModel({ modelPath: path, skeletonPath: "", modelObject: 1 }, assets);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.groups).toHaveLength(1);
    expect(parsed.value.groups[0]?.children).toHaveLength(1);
    const workspace = loadScriptSample(createScriptWorkspaceContext(file.endsWith("3dmf") ? BugdomGlobals : OttoGlobals, 0), "hover-beacon");
    const definition = workspace.customObjects[0];
    if (!definition) return expect.fail("Missing sample definition");
    const state = { ...workspace, assets, customObjects: [{ ...definition,
      visual: { kind: "customDisplayGroup", modelPath: path, modelObject: 1, scale: 1, slot: 450 },
    }] } satisfies ScriptWorkspaceState;
    expect(validateScriptWorkspaceAssets(state).isOk()).toBe(true);
    const selected = state.customObjects[0];
    if (!selected) return expect.fail("Missing selected model definition");
    expect(validateScriptWorkspaceAssets({ ...state, customObjects: [{ ...selected, visual: { ...selected.visual, modelObject: 9999 } }] }).isErr()).toBe(true);
  });

  it.each(fixtures)("loads actual %s skeleton meshes and animation tracks", async (game, model, skeleton) => {
    const parsed = await parseUploadedObjectModel({ modelPath: `Data/Scripts/assets/${model}`, skeletonPath: `Data/Scripts/assets/${skeleton.slice(0, -5)}`, modelObject: 0 }, fixtureAssets(game, model, skeleton));
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    expect(parsed.value.skeleton?.bones.length).toBeGreaterThan(0);
    expect(parsed.value.skeleton?.animations.length).toBeGreaterThan(0);
    const document = bg3dParsedToGLTF(parsed.value);
    expect(document.getRoot().listSkins().length).toBeGreaterThan(0);
    expect(document.getRoot().listAnimations().length).toBe(parsed.value.skeleton?.animations.length);
    for (const animation of document.getRoot().listAnimations()) {
      expect(animation.listChannels().length).toBeGreaterThan(0);
      for (const sampler of animation.listSamplers()) {
        const values = sampler.getOutput()?.getArray();
        expect(values?.length).toBeGreaterThan(0);
        expect(values && Array.from(values).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("recovers from an incomplete upload and malformed model without retaining the failed result", async () => {
    const assets = fixtureAssets("bugdom2", "Mouse.bg3d", "Mouse.skeleton.rsrc");
    const selection = { modelPath: "Data/Scripts/assets/Mouse.bg3d", skeletonPath: "Data/Scripts/assets/Mouse.skeleton", modelObject: 0 };
    expect((await parseUploadedObjectModel(selection, {})).isErr()).toBe(true);
    const corrupt = { ...assets, [selection.modelPath]: asset(selection.modelPath, new Uint8Array([1, 2, 3])) };
    expect((await parseUploadedObjectModel(selection, corrupt)).isErr()).toBe(true);
    expect((await parseUploadedObjectModel(selection, assets)).isOk()).toBe(true);
    expect((await parseUploadedObjectModel({ ...selection, skeletonPath: "", modelObject: 10000 }, assets)).isErr()).toBe(true);
    expect((await parseUploadedObjectModel({ ...selection, skeletonPath: "" }, assets)).isOk()).toBe(true);
  });

  it("rejects non-finite mesh coordinates before conversion or export", async () => {
    const assets = fixtureAssets("bugdom2", "Mouse.bg3d", "Mouse.skeleton.rsrc");
    const parsed = await parseUploadedObjectModel({ modelPath: "Data/Scripts/assets/Mouse.bg3d", skeletonPath: "", modelObject: 0 }, assets);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isErr()) return;
    const errors = validateParsedNativeModel({ ...parsed.value, groups: [{ children: [{ type: 1, numMaterials: 0, layerMaterialNum: [], flags: 0, numPoints: 1, numTriangles: 0, vertices: [[Number.NaN, 0, 0]], triangles: [] }] }] }, "bad.bg3d");
    expect(errors).toContain("bad.bg3d.group0.child0: geometry contains non-finite vertex coordinates");
  });

  it("cancels worker conversion and removes listeners when the selection changes", async () => {
    const parsed = await parseUploadedObjectModel({ modelPath: "Data/Scripts/assets/Mouse.bg3d", skeletonPath: "", modelObject: 0 }, fixtureAssets("bugdom2", "Mouse.bg3d", "Mouse.skeleton.rsrc"));
    if (parsed.isErr()) return;
    const remove = vi.fn();
    const worker: Pick<Worker, "addEventListener" | "removeEventListener" | "postMessage"> = { addEventListener: vi.fn(), removeEventListener: remove, postMessage: vi.fn() };
    const controller = new AbortController();
    const pending = convertUploadedModel(worker, parsed.value, controller.signal);
    controller.abort();
    expect((await pending).isErr()).toBe(true);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it("does not submit an already cancelled selection to the worker", async () => {
    const post = vi.fn();
    const worker: Pick<Worker, "addEventListener" | "removeEventListener" | "postMessage"> = { addEventListener: vi.fn(), removeEventListener: vi.fn(), postMessage: post };
    const controller = new AbortController();
    controller.abort();
    const result = await convertUploadedModel(worker, { groups: [], materials: [] }, controller.signal);
    expect(result.isErr()).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });
});
