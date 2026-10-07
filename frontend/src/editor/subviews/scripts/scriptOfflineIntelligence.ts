import type { ApiFunction } from "./scriptApiSchema";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { buildApiCompletionInsertText, buildApiSignature, luaFieldType, nativeIdInsertText } from "./scriptCompletionText";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { findLuaCallSite, findLuaExportedTable, findLuaFunctionContext, findLuaQualifiedToken, luaNonCodeAtCursor, tokenizeLua } from "./scriptLuaCode";
import { getObjectCallbackReferences } from "./scriptObjectCallbackReference";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export interface OfflineScriptCompletion {
  readonly label: string;
  readonly insertText: string;
  readonly snippet: boolean;
  readonly kind: "function" | "field" | "snippet" | "value";
  readonly detail: string;
  readonly documentation: string;
  readonly replaceStart: number;
  readonly replaceEnd: number;
}

function availableApis(state: ScriptWorkspaceState): readonly ApiFunction[] {
  return getAvailableApiFunctions(state.context.gameId, SCRIPTING_CONTRACT.api.apis);
}

export function getOfflineScriptSignature(state: ScriptWorkspaceState, source: string, offset: number): { readonly api: ApiFunction; readonly activeParameter: number } | null {
  if (luaNonCodeAtCursor(source, offset)?.kind === "comment") return null;
  const call = findLuaCallSite(source, offset);
  const api = call ? availableApis(state).find((entry) => entry.name === call.name) : undefined;
  return api && call ? { api, activeParameter: Math.min(call.activeParameter, Math.max(api.parameters.length - 1, 0)) } : null;
}

export function getOfflineScriptHover(state: ScriptWorkspaceState, source: string, offset: number): { readonly api: ApiFunction; readonly start: number; readonly end: number } | null {
  const token = findLuaQualifiedToken(source, offset);
  const api = token ? availableApis(state).find((entry) => entry.name === token.name) : undefined;
  return api && token ? { api, start: token.start, end: token.end } : null;
}

function objectBehaviorTarget(state: ScriptWorkspaceState, source: string, sourcePath: string): string | null {
  const definition = state.customObjects.find((entry) => entry.sourceFilePath === sourcePath);
  if (!definition) return null;
  const code = tokenizeLua(source).filter((token) => token.kind !== "comment" && token.kind !== "string");
  for (const [index, token] of code.entries()) {
    if (token.text !== definition.exportName || code[index + 1]?.text !== "=") continue;
    const target = code[index + 2];
    if (target?.kind === "name") return target.text;
  }
  return null;
}

function nativeArgumentCompletions(state: ScriptWorkspaceState, source: string, offset: number): readonly OfflineScriptCompletion[] | null {
  const call = findLuaCallSite(source, offset);
  const api = call ? availableApis(state).find((entry) => entry.name === call.name && entry.completion === "native-spawn") : undefined;
  if (!call || !api || call.activeParameter !== 0) return null;
  const nonCode = luaNonCodeAtCursor(source, offset);
  if (nonCode?.kind === "comment") return [];
  const argument = source.slice(call.argumentStart, offset).trimStart();
  const quoted = argument.startsWith('"') || argument.startsWith("'");
  const quote = quoted ? argument[0] : undefined;
  if (nonCode && !quoted) return [];
  const query = quoted ? argument.slice(1) : argument;
  if (!/^[A-Za-z0-9_.-]*$/.test(query)) return [];
  const start = offset - query.length;
  let end = offset;
  while (/[A-Za-z0-9_.-]/.test(source[end] ?? "")) end++;
  const game = SCRIPTING_CONTRACT.api.games.find((entry) => entry.gameId === state.context.gameId);
  return (game?.nativeSpawns ?? []).filter((entry) => entry.id.startsWith(query)).map((entry) => ({
    label: entry.id, insertText: quoted ? `${entry.id}${source[end] === quote ? "" : quote ?? ""}` : nativeIdInsertText(entry.id), snippet: false, kind: "value", detail: `${entry.category} · ${entry.label}`, documentation: entry.description, replaceStart: start, replaceEnd: end,
  }));
}

function callbackContextFields(state: ScriptWorkspaceState, source: string, offset: number, target: string | null): Readonly<Record<string, string>> {
  const context = findLuaFunctionContext(source, offset);
  if (!context || !context.parameters.includes("ctx")) return {};
  const game = SCRIPTING_CONTRACT.api.games.find((entry) => entry.gameId === state.context.gameId);
  const common = { gameId: "string", gameName: "string", levelNum: "integer", levelName: "string|nil", ...Object.fromEntries((game?.contextFields ?? []).map((field) => [field.name, `${luaFieldType(field)}${field.optional ? "|nil" : ""}`])) };
  const itemCallback = target && context.name.startsWith(`${target}.`) ? getObjectCallbackReferences(state.context.supportedHooks, "").find((entry) => context.name === `${target}.${entry.name}`) : undefined;
  if (itemCallback) return { ...common, ...itemCallback.fields };
  const name = context.name.split(".").at(-1);
  const event = SCRIPTING_CONTRACT.events.find((entry) => entry.id === name);
  if (name === "onFrame") return { ...common, deltaSeconds: "number", levelTimeSeconds: "number", frameNum: "integer" };
  return name && state.context.supportedHooks.some((hook) => hook === name) ? { ...common, ...event?.payload } : {};
}

export function getOfflineScriptCompletions(state: ScriptWorkspaceState, source: string, offset: number, sourcePath: string): readonly OfflineScriptCompletion[] {
  const native = nativeArgumentCompletions(state, source, offset);
  if (native) return native;
  if (luaNonCodeAtCursor(source, offset)) return [];
  const prefix = source.slice(0, offset).match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]*)*$/)?.[0] ?? "";
  const replaceStart = offset - prefix.length;
  let replaceEnd = offset;
  while (/[A-Za-z0-9_]/.test(source[replaceEnd] ?? "")) replaceEnd++;
  const range = { replaceStart, replaceEnd };
  const target = objectBehaviorTarget(state, source, sourcePath);
  const moduleTarget = target ? null : findLuaExportedTable(source);
  if (prefix.startsWith("self.")) {
    const context = findLuaFunctionContext(source, offset);
    if (!context?.parameters.includes("self")) return [];
    const fields: Readonly<Record<string, string>> = { handle: "ObjectHandle", parameters: "Resolved definition and instance parameters" };
    const parameters = state.params.filter((entry) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(entry.id)).map((entry) => ({ name: `self.parameters.${entry.id}`, type: `${entry.type}|nil`, description: `${entry.description}\nConfigure or bind this parameter for the current item before using it; unconfigured values may be nil.` }));
    return [...Object.entries(fields).map(([name, type]) => ({ name: `self.${name}`, type, description: type })), ...parameters].filter((entry) => entry.name.startsWith(prefix)).map((entry) => ({ ...range, label: entry.name, insertText: entry.name, snippet: false, kind: "field", detail: entry.type, documentation: entry.description }));
  }
  if (prefix.startsWith("ctx.")) return Object.entries(callbackContextFields(state, source, offset, target)).filter(([name]) => `ctx.${name}`.startsWith(prefix)).map(([name, type]) => ({ ...range, label: `ctx.${name}`, insertText: `ctx.${name}`, snippet: false, kind: "field", detail: type, documentation: `${name}: ${type}` }));
  if (prefix.includes(".") && !prefix.startsWith("pangea.") && !(target && prefix.startsWith(`${target}.`)) && !(moduleTarget && prefix.startsWith(`${moduleTarget}.`))) return [];
  const apis = availableApis(state).filter((api) => api.name.startsWith(prefix)).map((api): OfflineScriptCompletion => ({ ...range, label: api.name, insertText: buildApiCompletionInsertText(api, (name) => name), snippet: true, kind: "function", detail: buildApiSignature(api), documentation: api.description ?? api.name }));
  if (prefix.startsWith("pangea.")) return apis;
  const declaration = /\bfunction\s+[A-Za-z_][A-Za-z0-9_.]*$/.test(source.slice(0, offset));
  if (!declaration && findLuaFunctionContext(source, offset)) return apis;
  const callbacks = target ? getObjectCallbackReferences(state.context.supportedHooks, "").filter((entry) => `${target}.${entry.name}`.startsWith(prefix) || entry.name.startsWith(prefix)).map((entry): OfflineScriptCompletion => ({
    ...range, label: `${target}.${entry.name}`, insertText: `${declaration ? "" : "function "}${target}.${entry.name}(self, ctx)\n  ${entry.returnType === "nil" ? "$0" : "return nil$0"}\nend`, snippet: true, kind: "snippet", detail: `${entry.contextType} → ${entry.returnType}`, documentation: entry.description,
  })) : [];
  const hooks = moduleTarget ? state.context.supportedHooks.filter((hook) => hook.startsWith(prefix) || `${moduleTarget}.${hook}`.startsWith(prefix)).map((hook): OfflineScriptCompletion => ({ ...range, label: hook, insertText: `${declaration ? "" : "function "}${moduleTarget}.${hook}(ctx)\n  $0\nend`, snippet: true, kind: "snippet", detail: "Level / game hook", documentation: `Add a ${hook} handler to the exported ${moduleTarget} table.` })) : [];
  return [...apis, ...callbacks, ...hooks];
}
