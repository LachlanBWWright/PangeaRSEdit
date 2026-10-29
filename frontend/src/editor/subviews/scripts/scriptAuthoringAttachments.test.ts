import { afterEach, describe, expect, it, vi } from "vitest";
import { strToU8 } from "fflate";
import { okAsync } from "neverthrow";
import type { PortableAssets, ProjectAsset } from "@pangea/desktop-contracts";
import { OttoGlobals } from "@/data/globals/globals";
import { buildScriptPackageZip, createScriptWorkspaceContext, importScriptPackageZip, loadScriptSample, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import { buildScriptDefinitionBundle, buildScriptDefinitionBundleAsync, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { buildScriptLibrary, readScriptLibrary } from "./scriptLibrary";
import { authoringArchiveFiles, readAuthoringArchiveFiles, sameScriptAuthoringAssets, selectedScriptAuthoringAssets, validateScriptAuthoringSelection } from "./scriptAuthoringAttachments";
import type { ScriptLibrary } from "./scriptLibrary";

vi.mock("./scriptLuaValidation", () => ({ validateLuaWorkspace: () => okAsync(undefined) }));

const id = "11111111-1111-4111-8111-111111111111";
const revision = "22222222-2222-4222-8222-222222222222";
const folder = `Assets/Models/${id}/${revision}`;
const source = `AuthoringSources/${id}/${revision}/robot.glb`;
const asset: ProjectAsset = { version: 1, id, revision, game: "OttoMatic", name: "Robot",
  source: { mode: "managed", path: source, originalName: "robot.glb", format: "glb", dependencies: [], fingerprint: "hash" },
  outputs: { model: `${folder}/model.bg3d`, skeleton: null, preview: `${folder}/preview.glb`, files: [`${folder}/model.bg3d`, `${folder}/preview.glb`] },
  recipe: { scale: 1, rotation: [0, 0, 0] }, animations: [], warnings: [], previousRevision: null, importedAt: "2026-10-23T00:00:00Z" };
const attachment: PortableAssets = { version: 1, assets: [asset], warnings: [], files: [
  { path: source, bytes: new Uint8Array([7, 8]) },
  { path: `${folder}/model.bg3d`, bytes: new Uint8Array([1]) },
  { path: `${folder}/preview.glb`, bytes: new Uint8Array([2]) },
] };
const originalBridge = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = originalBridge; });

describe("editable source attachments", () => {
  it("compares authoring files by bytes without serializing binary payloads", () => {
    expect(sameScriptAuthoringAssets(attachment, attachment)).toBe(true);
    expect(sameScriptAuthoringAssets(attachment, { ...attachment, files: [...attachment.files].reverse() })).toBe(true);
    expect(sameScriptAuthoringAssets(attachment, { ...attachment, files: attachment.files.map((file) => ({ ...file, bytes: new Uint8Array([9]) })) })).toBe(false);
  });
  it("retains editable records and source bytes through browser object and workspace backups", async () => {
    window.pangeaDesktop = undefined;
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const state: ScriptWorkspaceState = { ...workspace, authoringAssets: attachment,
      customObjects: workspace.customObjects.map((object) => ({ ...object, assetId: id })),
    };
    const objects = await buildScriptDefinitionBundleAsync(state, { includeAuthoringSources: true });
    if (objects.isErr()) return expect.fail(objects.error);
    const importedObjects = importScriptDefinitionBundle(objects.value, context);
    expect(importedObjects.isOk() && importedObjects.value.authoringAssets).toEqual(attachment);
    const archive = await buildScriptPackageZip(state);
    if (archive.isErr()) return expect.fail(archive.error);
    const restored = importScriptPackageZip(archive.value, context);
    if (restored.isErr()) return expect.fail(restored.error);
    expect(restored.value.authoringAssets).toEqual(attachment);
    const repeated = await buildScriptPackageZip(restored.value);
    if (repeated.isErr()) return expect.fail(repeated.error);
    const restoredAgain = importScriptPackageZip(repeated.value, context);
    expect(restoredAgain.isOk() && restoredAgain.value.authoringAssets).toEqual(attachment);
  });

  it("filters editable records and source files to selected object assets", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const original = workspace.customObjects[0];
    if (!original) { expect.fail("Missing sample definition"); return; }
    const otherId = "33333333-3333-4333-8333-333333333333";
    const otherFile = `AuthoringSources/${otherId}/unused.glb`;
    const fullAttachment: PortableAssets = { ...attachment,
      assets: [...attachment.assets, { ...asset, id: otherId }],
      files: [...attachment.files, { path: otherFile, bytes: new Uint8Array([9]) }],
    };
    const state = { ...workspace, customObjects: [{ ...original, assetId: id }, { ...original, id: "other", assetId: otherId }] };
    const output = buildScriptDefinitionBundle(state, fullAttachment, [original.id]);
    if (output.isErr()) { expect.fail(output.error); return; }
    const imported = importScriptDefinitionBundle(output.value, context);
    expect(imported.isOk() && imported.value.authoringAssets).toEqual(attachment);
  });

  it("restores only accepted object dependencies and explicitly selected runtime assets", () => {
    const state = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const original = state.customObjects[0];
    if (!original) { expect.fail("Missing sample definition"); return; }
    const modelPath = `Data/Scripts/assets/project/${id}/model.bg3d`;
    const object = { ...original, assetId: id,
      visual: { kind: "customDisplayGroup", modelPath, scale: 1, slot: 450, modelObject: 0 } } satisfies ScriptWorkspaceState["customObjects"][number];
    const library: ScriptLibrary = { manifest: { kind: "pangea-script-library", version: 1, gameId: state.context.gameId,
      objects: [object], behaviors: [], params: [], sources: [object.sourceFilePath], assets: [modelPath], moduleOrder: [] },
      sources: { [object.sourceFilePath]: "return {}" }, assets: { [modelPath]: new Uint8Array([1]) }, authoringAssets: attachment };
    expect(selectedScriptAuthoringAssets(library, new Set([`source:${object.sourceFilePath}`]))).toBeNull();
    expect(selectedScriptAuthoringAssets(library, new Set([`object:${object.id}`]))).toEqual(attachment);
    expect(selectedScriptAuthoringAssets(library, new Set([`asset:${modelPath}`]))).toEqual(attachment);
    const existing = { ...state, assets: { [modelPath]: { path: modelPath, bytes: new Uint8Array([9]), sourceName: "local.bg3d" } } };
    expect(validateScriptAuthoringSelection(existing, library, new Set([`object:${object.id}`])).isErr()).toBe(true);
    expect(validateScriptAuthoringSelection(existing, library, new Set([`source:${object.sourceFilePath}`])).isOk()).toBe(true);
    expect(validateScriptAuthoringSelection({ ...existing, assets: { [modelPath]: { path: modelPath, bytes: new Uint8Array([1]), sourceName: "model.bg3d" } } },
      library, new Set([`object:${object.id}`])).isOk()).toBe(true);
  });
  it("exports the latest shared native model instead of stale object snapshots", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const original = workspace.customObjects[0];
    if (!original) { expect.fail("Missing real sample definition"); return; }
    const modelPath = `Data/Scripts/assets/project/${id}/model.bg3d`;
    const state: ScriptWorkspaceState = { ...workspace, customObjects: [{ ...original, assetId: id,
      visual: { kind: "customDisplayGroup", modelPath, scale: 1, slot: 450, modelObject: 0 } }],
      assets: { ...workspace.assets, [modelPath]: { path: modelPath, bytes: new Uint8Array([9]), sourceName: "old.bg3d" } } };
    const request = vi.fn(async (request: { operation: string }) => {
      if (request.operation === "assets.list") return { ok: true, value: [asset] };
      if (request.operation === "project.read") return { ok: true, value: [{ path: asset.outputs.model, bytes: new Uint8Array([3, 4]) }] };
      return { ok: true, value: attachment };
    });
    window.pangeaDesktop = { request, onTransfer: () => () => undefined, onProjectChange: () => () => undefined };
    const output = await buildScriptDefinitionBundleAsync(state, { includeAuthoringSources: true });
    if (output.isErr()) { expect.fail(output.error); return; }
    const imported = importScriptDefinitionBundle(output.value, context);
    expect(imported.isOk() && imported.value.assets[modelPath]).toEqual(new Uint8Array([3, 4]));
    expect(request).toHaveBeenCalledWith({ operation: "assets.export-bundle", ids: [id], includeSources: true });
    expect(state.assets[modelPath]?.bytes).toEqual(new Uint8Array([9]));
  });

  it("round trips portable records and source bytes through object and library archives", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const objects = buildScriptDefinitionBundle(workspace, attachment);
    if (objects.isErr()) { expect.fail(objects.error); return; }
    const imported = importScriptDefinitionBundle(objects.value, context);
    expect(imported.isOk() && imported.value.authoringAssets).toEqual(attachment);
    const library = buildScriptLibrary(workspace, attachment);
    if (library.isErr()) { expect.fail(library.error); return; }
    const read = await readScriptLibrary(library.value, context.gameId);
    expect(read.isOk() && read.value.authoringAssets).toEqual(attachment);
  });

  it("rejects undeclared, missing or traversal source payloads", () => {
    const entries = authoringArchiveFiles(attachment);
    expect(readAuthoringArchiveFiles({ ...entries, "EditableAssets/extra.blend": new Uint8Array([1]) }).isErr()).toBe(true);
    const missing = Object.fromEntries(Object.entries(entries).filter(([path]) => path !== `EditableAssets/${source}`));
    expect(readAuthoringArchiveFiles(missing).isErr()).toBe(true);
    const malicious = { ...entries, "EditableAssets/assets.json": strToU8(JSON.stringify({ ...attachment, files: ["../../outside.blend"] })) };
    expect(readAuthoringArchiveFiles(malicious).isErr()).toBe(true);
  });
});
