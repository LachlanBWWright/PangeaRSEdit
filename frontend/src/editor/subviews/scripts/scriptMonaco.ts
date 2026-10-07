import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { scriptLspClient } from "./scriptLspClient";
import { ScriptMonacoWorkspaceRegistry } from "./scriptMonacoWorkspaceRegistry";
import { registerScriptIntelligence } from "./scriptMonacoIntelligence";
import { registerScriptNavigation } from "./scriptMonacoNavigation";
import { registerScriptFormatting } from "./scriptMonacoFormatting";

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker: (_moduleId: string, label: string) => Worker };
  }
}

let configured = false;
let providers: readonly monaco.IDisposable[] = [];
const workspaces = new ScriptMonacoWorkspaceRegistry();
const trackedModels = new WeakSet<monaco.editor.ITextModel>();

function trackScriptModel(model: monaco.editor.ITextModel): void {
  if (model.getLanguageId() !== "lua" || trackedModels.has(model)) return;
  trackedModels.add(model);
  scriptLspClient.openDocument(model);
  const changes = model.onDidChangeContent((event) => scriptLspClient.changeDocument(model, event));
  model.onWillDispose(() => {
    changes.dispose();
    scriptLspClient.closeDocument(model);
  });
}

function workspaceForModel(model: monaco.editor.ITextModel): ScriptWorkspaceState | null {
  if (model.isDisposed()) return null;
  return workspaces.forUri(model.uri.toString());
}

export function ensureScriptMonacoConfigured(): void {
  if (configured) return;
  window.MonacoEnvironment = { getWorker: () => new editorWorker() };
  loader.config({ monaco });
  monaco.editor.onDidCreateModel(trackScriptModel);
  for (const model of monaco.editor.getModels()) trackScriptModel(model);
  configured = true;
}

export function configureScriptMonaco(state: ScriptWorkspaceState, getWorkspace: () => ScriptWorkspaceState = () => state): readonly monaco.IDisposable[] {
  ensureScriptMonacoConfigured();
  const registration = workspaces.register(getWorkspace);
  if (providers.length === 0) providers = [
    ...registerScriptIntelligence(workspaceForModel),
    ...registerScriptNavigation(workspaceForModel),
    registerScriptFormatting(workspaceForModel),
  ];
  if (hasConfiguredApiEndpoint()) void scriptLspClient.connect(state).match(() => undefined, () => undefined);
  return [{ dispose: () => {
    if (!registration.dispose() || workspaces.size > 0) return;
    for (const provider of providers) provider.dispose();
    providers = [];
    void scriptLspClient.disconnect().match(() => undefined, () => undefined);
  } }];
}
