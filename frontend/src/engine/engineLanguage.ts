import type { ScriptSourceFile, ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";
import { buildScriptTypeDeclarationFiles } from "@/editor/subviews/scripts/scriptTypeDeclarations";
import { engineFileText, type EnginePackage } from "./enginePackage";
import { ENGINE_MODULE_FUNCTIONS, ENGINE_MODULE_TYPES } from "./engineModuleLanguage";
import { ENGINE_RECONSTRUCTION_FUNCTIONS, ENGINE_RECONSTRUCTION_TYPES } from "./engineReconstructionLanguage";

const ENGINE_CONTEXT: ScriptWorkspaceState["context"] = { gameId: "PangeaSandbox", gameLabel: "Pangea Engine", levelNumber: null,
  levelKey: "engine:package", allowedTags: [], supportedHooks: ["onGameStart", "onLevelLoad", "onLevelStart", "onFrame", "onObjectFrame", "onLevelUnload", "onGameShutdown"] };

export const ENGINE_FUNCTIONS = [
  ...ENGINE_MODULE_FUNCTIONS,
  ...ENGINE_RECONSTRUCTION_FUNCTIONS,
  { name: "terrain", signature: "config: EngineTerrain", returns: "EngineResult", description: "Replace terrain from a validated heightfield declaration." },
  { name: "density", signature: "cells: integer", returns: "EngineResult", description: "Change render subdivisions without changing collision heights." },
  { name: "height", signature: "x: number, z: number", returns: "number|nil", description: "Query authoritative world-space height." },
  { name: "terrainInfo", signature: "", returns: "EngineTerrainInfo", description: "Read terrain dimensions and render density." },
  { name: "camera", signature: "from: Vector3, target: Vector3, fov?: number", returns: "EngineResult", description: "Set the view from Lua." },
  { name: "key", signature: "scancode: string", returns: "boolean", description: "Read a physical SDL key, e.g. W or Space." },
  { name: "title", signature: "text: string", returns: "EngineResult", description: "Set the window title." },
  { name: "model", signature: "path: string", returns: "EngineModelResult", description: "Load a package BG3D/3DMF model and discover its groups." },
  { name: "releaseModel", signature: "modelId: string", returns: "EngineResult", description: "Release an unused model and its GPU textures. Live instances prevent release; stale IDs remain invalid." },
  { name: "asset", signature: "id: string", returns: "string|nil", description: "Resolve a stable scene asset ID to its runtime model ID." },
  { name: "resources", signature: "path: string", returns: "EngineResourceInfo", description: "Enumerate an AppleDouble resource sidecar." },
  { name: "resource", signature: "path: string, resourceType: string, id: integer", returns: "string|nil, EngineResult", description: "Read a typed resource payload." },
  { name: "packageInfo", signature: "", returns: "EnginePackageInfo", description: "Read the package and scene catalog." },
  { name: "sceneInfo", signature: "", returns: "EngineSceneInfo", description: "Read current scene generation and transition diagnostics." },
  { name: "transition", signature: "sceneId: string", returns: "EngineResult", description: "Stage a scene transition for the simulation boundary." },
  { name: "pause", signature: "paused: boolean", returns: "EngineResult", description: "Pause simulation time and physics while UI callbacks continue." },
  { name: "body", signature: "actor: ObjectHandle, config: EngineBody", returns: "EngineResult", description: "Configure gravity, bounds, collision and motion mode." },
  { name: "bodyInfo", signature: "actor: ObjectHandle", returns: "EngineBodyInfo|nil", description: "Read grounded and collision state." },
  { name: "color", signature: "actor: ObjectHandle, color: EngineColor", returns: "EngineResult", description: "Set primitive color and instance opacity." },
  { name: "ui", signature: "declaration: EngineUI", returns: "EngineResult", description: "Publish a bounded Lua-owned menu or HUD." },
  { name: "uiEvents", signature: "", returns: "EngineUIAction[]", description: "Drain validated actions from this scene generation." },
] satisfies readonly { name: string; signature: string; returns: string; description: string }[];

export function engineScriptWorkspace(packageData: EnginePackage): ScriptWorkspaceState {
  const sourceFiles: Record<string, ScriptSourceFile> = {};
  for (const file of packageData.files) {
    if (!file.path.endsWith(".lua")) continue;
    const text = engineFileText(file);
    const path = `Data/Scripts/src/${file.path}`;
    if (text.isOk()) sourceFiles[path] = { path, content: text.value, savedContent: text.value, language: "lua", readOnly: false, role: "user" };
  }
  const engineTypes = engineDeclarations();
  sourceFiles["Data/Scripts/types/engine.lua"] = { path: "Data/Scripts/types/engine.lua", content: engineTypes, savedContent: engineTypes, language: "lua", readOnly: true, role: "user" };
  return { projectVersion: 1, context: ENGINE_CONTEXT,
    activeFilePath: "main.lua", behaviorCatalog: [], moduleOrder: [], sourceFiles, compiledFiles: {}, customObjects: [],
    params: [], assets: {}, diagnostics: [], statusLog: [], sampleId: null, levels: {} };
}

export function engineDeclarations() {
  const definitions = [
    ...ENGINE_MODULE_TYPES, ...ENGINE_RECONSTRUCTION_TYPES,
    "---@class EngineResult\n---@field ok boolean\n---@field message string",
    "---@class EngineColor\n---@field r number\n---@field g number\n---@field b number\n---@field a number",
    "---@class EngineTerrain\n---@field samplesX integer\n---@field samplesZ integer\n---@field sizeX number\n---@field sizeZ number\n---@field chunkSize number\n---@field cellsPerChunk integer\n---@field heights number[]\n---@field splits? integer[] Per-cell diagonal, zero for backslash and one for slash.",
    "---@class EngineTerrainInfo\n---@field samplesX integer\n---@field samplesZ integer\n---@field sizeX number\n---@field sizeZ number\n---@field chunkSize number\n---@field cellsPerChunk integer\n---@field chunks integer",
    "---@class EngineBody\n---@field mode 'static'|'dynamic'|'kinematic'\n---@field halfExtents? Vector3\n---@field gravity? number\n---@field gravityVector? Vector3\n---@field groundUp? Vector3\n---@field collision? boolean\n---@field layer? string\n---@field mask? integer\n---@field sensor? boolean\n---@field restitution? number\n---@field friction? number\n---@field groundThreshold? number",
    "---@class EngineBodyInfo\n---@field mode string\n---@field grounded boolean\n---@field collision boolean\n---@field gravity number\n---@field mask integer\n---@field layer integer\n---@field sensor boolean\n---@field groundObject ObjectHandle\n---@field contactNormal Vector3",
    "---@class EngineModelGroup\n---@field id string\n---@field index integer\n---@field min Vector3\n---@field max Vector3",
    "---@class EngineModelResult: EngineResult\n---@field id string\n---@field meshes integer\n---@field groups EngineModelGroup[]",
    "---@class EngineResourceInfo: EngineResult\n---@field types integer\n---@field resources integer",
    "---@class EngineSceneEntry\n---@field id string\n---@field name string\n---@field controller string",
    "---@class EnginePackageInfo\n---@field id string\n---@field version integer\n---@field scenes EngineSceneEntry[]",
    "---@class EngineSceneInfo\n---@field id string\n---@field generation integer\n---@field error string\n---@field transitionPending boolean",
    "---@class EngineWidget\n---@field id string\n---@field type 'text'|'button'|'meter'\n---@field text string\n---@field shortcut? string\n---@field disabled? boolean\n---@field value? number\n---@field max? number",
    "---@class EngineUI\n---@field title? string\n---@field modal? boolean\n---@field widgets EngineWidget[]",
    "---@class EngineUIAction\n---@field id string\n---@field generation integer",
    "---@class EngineApi\n---@field version integer\n---@field assetPath string",
    ...ENGINE_FUNCTIONS.map((api) => `---${api.description}\n---@field ${api.name} fun(${api.signature}): ${api.returns}`),
    "---@type EngineApi\nlocal engine = {}\nreturn engine",
  ];
  return "---@meta\n\n" + definitions.join("\n") + "\n";
}
export function engineTypeFiles(packageData: EnginePackage) {
  return [
    ...buildScriptTypeDeclarationFiles(engineScriptWorkspace(packageData)).map((file) => ({ path: file.path.replace("Data/Scripts/types/", "types/"), bytes: new TextEncoder().encode(file.content) })),
    { path: "types/engine.lua", bytes: new TextEncoder().encode(engineDeclarations()) },
    { path: ".luarc.json", bytes: new TextEncoder().encode(JSON.stringify({ runtime: { version: "Lua 5.4", path: ["?.lua", "?/init.lua"] }, workspace: { library: ["types"] } }, null, 2)) },
  ];
}
