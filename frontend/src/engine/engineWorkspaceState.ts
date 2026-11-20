import { err } from "neverthrow";
import type { Dispatch, RefObject } from "react";
import type { EngineManifest, EngineMessage } from "./engineSchemas";
import { enginePathSchema } from "./engineSchemas";
import { engineFile, equalEnginePackages, parseManifest, replaceEngineJSON, replaceEngineText, type EnginePackage } from "./enginePackage";
import { createFoundationPackage } from "./foundationPackage";
import { addEngineFiles } from "./engineFiles";

export interface EngineRuntimeSummary { scene: string; generation: number; seconds: number; actors: number; triangles: number; error: string; paused: boolean; scenes: { id: string; name: string }[] }
export interface EngineWorkspaceState {
  packageData: EnginePackage; selected: string; dirty: boolean; epoch: number;
  ready: boolean; status: string; runtime: EngineRuntimeSummary | null;
  past: EnginePackage[]; future: EnginePackage[];
  savedPackage: EnginePackage;
}
export type EngineWorkspaceAction =
  | { type: "load"; packageData: EnginePackage }
  | { type: "select"; path: string }
  | { type: "edit"; path: string; content: string }
  | { type: "replace"; packageData: EnginePackage; selected?: string }
  | { type: "status"; message: string }
  | { type: "saved" }
  | { type: "discard" }
  | { type: "previewReset" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "runtime"; message: EngineMessage };
export function initialEngineWorkspace(): EngineWorkspaceState {
  const packageData = createFoundationPackage();
  return { packageData, savedPackage: packageData, selected: "package.json", dirty: false, epoch: 0, ready: false, status: "Ready to preview the engine foundation.", runtime: null, past: [], future: [] };
}
export function engineWorkspaceReducer(state: EngineWorkspaceState, action: EngineWorkspaceAction): EngineWorkspaceState {
  switch (action.type) {
    case "load": return { ...state, packageData: action.packageData, savedPackage: action.packageData, selected: "package.json", dirty: false, epoch: state.epoch + 1, status: "Package opened.", past: [], future: [] };
    case "select": return { ...state, selected: action.path };
    case "edit": {
      const packageData = replaceEngineText(state.packageData, action.path, action.content);
      return packageData === state.packageData ? state : { ...state, packageData, dirty: !equalEnginePackages(packageData, state.savedPackage), past: [...state.past.slice(-19), state.packageData], future: [] };
    }
    case "replace": return equalEnginePackages(action.packageData, state.packageData) ? state : { ...state, packageData: action.packageData, selected: action.selected ?? state.selected, dirty: !equalEnginePackages(action.packageData, state.savedPackage), past: [...state.past.slice(-19), state.packageData], future: [] };
    case "previewReset": return { ...state, ready: false, runtime: null };
    case "undo": {
      const previous = state.past.at(-1);
      return previous ? { ...state, packageData: previous, selected: engineFile(previous, state.selected) ? state.selected : "package.json", past: state.past.slice(0, -1), future: [state.packageData, ...state.future], dirty: !equalEnginePackages(previous, state.savedPackage) } : state;
    }
    case "redo": {
      const next = state.future[0];
      return next ? { ...state, packageData: next, selected: engineFile(next, state.selected) ? state.selected : "package.json", future: state.future.slice(1), past: [...state.past, state.packageData], dirty: !equalEnginePackages(next, state.savedPackage) } : state;
    }
    case "status": return { ...state, status: action.message };
    case "saved": return { ...state, savedPackage: state.packageData, dirty: false, status: "Package downloaded with schemas and Lua types." };
    case "discard": return { ...state, packageData: state.savedPackage, selected: engineFile(state.savedPackage, state.selected) ? state.selected : "package.json", dirty: false, past: [], future: [], epoch: state.epoch + 1, ready: false, runtime: null, status: "Unsaved edits discarded." };
    case "runtime": {
      if (action.message.type === "pangea.ready") return { ...state, ready: true };
      if (action.message.type === "pangea.loaded") return { ...state, status: action.message.ok ? "Preview updated." : "Preview rejected the package. The previous valid scene is retained when validation fails." };
      const { session, state: counters } = action.message;
      const runtime = { scene: session.scene, generation: session.generation, seconds: Math.floor(session.time), actors: counters.actors, triangles: counters.triangles, error: session.error, paused: session.paused, scenes: session.scenes };
      const old = state.runtime;
      if (old && old.scene === runtime.scene && old.generation === runtime.generation && old.seconds === runtime.seconds && old.actors === runtime.actors && old.triangles === runtime.triangles && old.error === runtime.error && old.paused === runtime.paused && old.scenes.length === runtime.scenes.length && old.scenes.every((scene, index) => scene.id === runtime.scenes[index]?.id && scene.name === runtime.scenes[index]?.name)) return state;
      return { ...state, runtime };
    }
  }
}
export function updateEngineManifest(packageData: EnginePackage, manifest: EngineManifest) { return replaceEngineJSON(packageData, "package.json", manifest); }
export function addEngineScene(packageData: EnginePackage, id: string, name: string) {
  const manifest = parseManifest(packageData);
  if (manifest.isErr()) return manifest;
  if (manifest.value.scenes.length >= 32) return err("A package supports up to 32 scenes.");
  if (!/^[A-Za-z0-9_-]+$/.test(id) || !name.trim() || name.length > 127 || manifest.value.scenes.some((scene) => scene.id === id)) return err("Use a unique scene ID with letters, numbers, underscores or hyphens.");
  const path = `scenes/${id}.json`, controllerPath = `scenes/${id}.lua`;
  if (engineFile(packageData, path) || engineFile(packageData, controllerPath) || !enginePathSchema.safeParse(path).success) return err("A file already uses this scene ID.");
  const scene = { version: 1, terrain: { samplesX: 2, samplesZ: 2, sizeX: 1000, sizeZ: 1000, chunkSize: 500, cellsPerChunk: 16, heights: [0, 0, 0, 0] }, colliders: [], assets: [] };
  const source = `local engine=require('engine')\nreturn {\n  onLevelStart=function()\n    assert(engine.camera({x=1000,y=700,z=1200},{x=500,y=0,z=500}).ok)\n  end,\n  onFrame=function(ctx)\n  end,\n}\n`;
  return addEngineFiles(packageData, [{ path, bytes: new TextEncoder().encode(JSON.stringify(scene, null, 2) + "\n") }, { path: controllerPath, bytes: new TextEncoder().encode(source) }]).andThen((next) => {
    const updated = updateEngineManifest(next, { ...manifest.value, scenes: [...manifest.value.scenes, { id, name, file: path, controller: `scenes.${id}` }] });
    return parseManifest(updated).map(() => updated);
  });
}
export function postEnginePackage(packageData: EnginePackage, frame: RefObject<HTMLIFrameElement | null>, dispatch: Dispatch<EngineWorkspaceAction>) {
  const target = frame.current?.contentWindow;
  if (!target) { dispatch({ type: "status", message: "The preview is still loading." }); return; }
  target.postMessage({ type: "pangea.loadPackage", version: 1, files: packageData.files }, window.location.origin);
  dispatch({ type: "status", message: "Validating package in the runtime…" });
}
export function postEngineScene(id: string, frame: RefObject<HTMLIFrameElement | null>) {
  frame.current?.contentWindow?.postMessage({ type: "pangea.scene", version: 1, id }, window.location.origin);
}
