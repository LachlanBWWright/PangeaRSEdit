import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { z } from "zod";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { scriptLspClient } from "./scriptLspClient";
import { mapLspCompletionItem, mapLspRange, lspDocumentation } from "./scriptLspMapping";
import { apiHoverAtPosition } from "./scriptApiAssistance";
import {
  buildApiCompletionInsertText,
  buildApiSignature,
  buildNativeIdSnippet,
  getContextualApiName,
  nativeIdInsertText,
} from "./scriptCompletionText";
import type { ApiFunction } from "./scriptApiSchema";
import { buildModuleHookSnippets } from "./scriptHookSnippets";
import type {
  LspCompletionItem,
  LspDocumentSymbol,
  LspLocation,
} from "./scriptLspSchemas";
import {
  lspCompletionResultSchema,
  lspCompletionItemSchema,
  lspDocumentSymbolSchema,
  lspHoverSchema,
  lspLocationSchema,
  lspLocationsSchema,
  lspSignatureHelpSchema,
} from "./scriptLspSchemas";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

let configured = false;

function mapLspLocation(location: LspLocation): monaco.languages.Location {
  return {
    uri: scriptLspClient.clientUri(location.uri),
    range: mapLspRange(location.range)
  };
}

function mapDocumentSymbol(
  symbol: LspDocumentSymbol,
): monaco.languages.DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail ?? "",
    kind: symbol.kind,
    tags: symbol.tags ?? [],
    range: mapLspRange(symbol.range),
    selectionRange: mapLspRange(symbol.selectionRange),
    children: symbol.children?.map(mapDocumentSymbol) ?? [],
  };
}

function getHoverValue(content: unknown): string | null {
  const stringResult = z.string().safeParse(content);
  if (stringResult.success) return stringResult.data;
  const valueResult = z.object({ value: z.string() }).safeParse(content);
  return valueResult.success ? valueResult.data.value : null;
}

function buildCompletionItems(
  state: Pick<ScriptWorkspaceState, "context">,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  range: monaco.IRange,
): readonly monaco.languages.CompletionItem[] {
  const hookItems = buildModuleHookSnippets(model.getValue(), state.context.supportedHooks).map((snippet) => ({
    label: snippet.name,
    kind: monaco.languages.CompletionItemKind.Snippet,
    range,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: `Insert ${snippet.name} on this module's exported table. Insert handlers before the final return statement.`,
    insertText: snippet.insertText,
  }));

  const linePrefix = model
    .getLineContent(position.lineNumber)
    .slice(0, position.column - 1);
  const contextualApiName = (qualifiedName: string): string =>
    getContextualApiName(linePrefix, qualifiedName);
  const game = SCRIPTING_CONTRACT.api.games.find(
    (candidate) => candidate.gameId === state.context.gameId,
  );
  const nativeSpawns = game?.nativeSpawns ?? [];
  const nativeSpawnIds = nativeSpawns.map((nativeSpawn) => nativeSpawn.id);
  const nativeIdSnippet = buildNativeIdSnippet(nativeSpawnIds);
  const specializedApiNames = new Set(
    SCRIPTING_CONTRACT.api.apis
      .filter((api) => api.completion === "native-spawn")
      .map((api) => api.name),
  );
  const nativeSpawnApi = SCRIPTING_CONTRACT.api.apis.find(
    (api) => api.completion === "native-spawn",
  );
  const availableApis = getAvailableApiFunctions(
    state.context.gameId,
    SCRIPTING_CONTRACT.api.apis,
  );
  const apiItems = [
    {
      label: nativeSpawnApi?.name ?? "pangea.spawn.native",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: nativeSpawnApi?.description ?? "Spawn a native game object at a position.",
      insertText: `${contextualApiName(nativeSpawnApi?.name ?? "pangea.spawn.native")}(${nativeIdSnippet}, { x = \${2:0}, y = \${3:0}, z = \${4:0} })`,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    },
  ].map((item) => ({
    ...item,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
  }));
  const schemaApiItems = availableApis
    .filter((api) => !specializedApiNames.has(api.name))
    .map((api) => ({
      label: api.name,
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      detail: buildApiSignature(api),
      documentation: api.description ?? api.name,
      insertText: buildApiCompletionInsertText(api, contextualApiName),
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    }));

  const nativeSpawnItems = nativeSpawns.map((nativeSpawn) => ({
    label: nativeSpawn.id,
    kind: monaco.languages.CompletionItemKind.EnumMember,
    range,
    detail: `${nativeSpawn.category} — ${nativeSpawn.label}`,
    documentation: [nativeSpawn.description, ...nativeSpawn.params.map((param) => `${param.name}: ${param.description}`)].join("\n\n"),
    insertText: nativeIdInsertText(nativeSpawn.id),
  }));

  const tagItems = state.context.allowedTags.map((tag) => ({
    label: tag.id,
    kind: monaco.languages.CompletionItemKind.Constant,
    range,
    documentation: tag.description,
    insertText: JSON.stringify(tag.id),
  }));

  return [
    ...hookItems,
    ...apiItems,
    ...schemaApiItems,
    ...nativeSpawnItems,
    ...tagItems,
    {
      label: "local pangea = require('pangea')",
      kind: monaco.languages.CompletionItemKind.Snippet,
      range,
      insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: "Seed a Lua module with the shared pangea runtime API.",
      insertText: 'local pangea = require("pangea")\n$0',
    },
  ];
}

function buildCompletionRange(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): monaco.IRange {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

function findApiAtCallSite(
  state: Pick<ScriptWorkspaceState, "context">,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): ApiFunction | null {
  const linePrefix = model
    .getLineContent(position.lineNumber)
    .slice(0, position.column - 1);
  const callMatch = /([A-Za-z_][A-Za-z0-9_.]*)\([^()]*$/.exec(linePrefix);
  const calledName = callMatch?.[1];
  if (calledName === undefined) return null;
  const apis = getAvailableApiFunctions(state.context.gameId, SCRIPTING_CONTRACT.api.apis);
  return apis.find((api) =>
    api.name === calledName || getContextualApiName(linePrefix, api.name) === calledName,
  ) ?? null;
}

function activeSignatureParameter(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
): number {
  const linePrefix = model
    .getLineContent(position.lineNumber)
    .slice(0, position.column - 1);
  const callStart = linePrefix.lastIndexOf("(");
  return callStart < 0 ? 0 : linePrefix.slice(callStart + 1).split(",").length - 1;
}

export function ensureScriptMonacoConfigured(): void {
  if (configured) {
    return;
  }

  window.MonacoEnvironment = {
    getWorker() {
      return new editorWorker();
    },
  };

  loader.config({ monaco });
  configured = true;
}

export function configureScriptMonaco(
  state: Pick<ScriptWorkspaceState, "context">,
): readonly monaco.IDisposable[] {
  ensureScriptMonacoConfigured();

  const completionSources = new WeakMap<monaco.languages.CompletionItem, { item: LspCompletionItem; range: monaco.IRange }>();

  const completionDisposable = monaco.languages.registerCompletionItemProvider(
    "lua",
    {
      triggerCharacters: [".", "\"", "("],
      async provideCompletionItems(model, position) {
        const range = buildCompletionRange(model, position);

        if (scriptLspClient.status === "connected") {
          const result = await scriptLspClient.request("textDocument/completion", {
              textDocument: { uri: scriptLspClient.documentUri(model) },
              position: { line: position.lineNumber - 1, character: position.column - 1 }
            });
          if (result.isOk()) {
            const parsed = lspCompletionResultSchema.safeParse(result.value);
            if (parsed.success) {
              const items = Array.isArray(parsed.data)
                ? parsed.data
                : parsed.data.items;
              return {
                suggestions: items.map((item) => {
                  const completion = mapLspCompletionItem(item, range);
                  completionSources.set(completion, { item, range });
                  return completion;
                }),
              };
            }
          }
        }

        // Fallback to snippets
        return {
          suggestions: [
            ...buildCompletionItems(state, model, position, range),
          ],
        };
      },
      async resolveCompletionItem(completion) {
        const source = completionSources.get(completion);
        if (!source || scriptLspClient.status !== "connected") return completion;
        const response = await scriptLspClient.request("completionItem/resolve", source.item);
        if (response.isErr()) return completion;
        const parsed = lspCompletionItemSchema.safeParse(response.value);
        return parsed.success ? mapLspCompletionItem(parsed.data, source.range) : completion;
      },
    },
  );

  const signatureHelpDisposable = monaco.languages.registerSignatureHelpProvider(
    "lua",
    {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [",", ")"],
      async provideSignatureHelp(model, position) {
        if (scriptLspClient.status === "connected") {
          const response = await scriptLspClient.request("textDocument/signatureHelp", {
            textDocument: { uri: scriptLspClient.documentUri(model) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
          });
          if (response.isOk()) {
            const parsed = lspSignatureHelpSchema.safeParse(response.value);
            if (parsed.success && parsed.data.signatures.length) return {
              value: {
                signatures: parsed.data.signatures.map((signature) => ({
                  ...signature,
                  documentation: lspDocumentation(signature.documentation),
                  parameters: (signature.parameters ?? []).map((parameter) => ({ ...parameter, documentation: lspDocumentation(parameter.documentation) })),
                })),
                activeSignature: parsed.data.activeSignature ?? 0,
                activeParameter: parsed.data.activeParameter ?? parsed.data.signatures[parsed.data.activeSignature ?? 0]?.activeParameter ?? 0,
              },
              dispose: () => undefined,
            };
          }
        }
        const api = findApiAtCallSite(state, model, position);
        if (api === null) return null;
        return {
          value: {
            signatures: [{
              label: buildApiSignature(api),
              documentation: api.description ?? "",
              parameters: api.parameters.map((parameter) => ({
                label: parameter.name,
                documentation: parameter.description ?? "",
              })),
            }],
            activeSignature: 0,
            activeParameter: Math.min(
              activeSignatureParameter(model, position),
              Math.max(api.parameters.length - 1, 0),
            ),
          },
          dispose: () => undefined,
        };
      },
    },
  );

  const hoverDisposable = monaco.languages.registerHoverProvider(
    "lua",
    {
      async provideHover(model, position) {
        const fallback = apiHoverAtPosition(state.context.gameId, model.getLineContent(position.lineNumber), position.column - 1);
        const fallbackHover = fallback ? { contents: [{ value: fallback }] } : null;
        if (scriptLspClient.status !== "connected") return fallbackHover;
        const result = await scriptLspClient.request("textDocument/hover", {
            textDocument: { uri: scriptLspClient.documentUri(model) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
        if (result.isErr()) return fallbackHover;
        const parsed = lspHoverSchema.safeParse(result.value);
        if (!parsed.success) return fallbackHover;
        const rawContents = Array.isArray(parsed.data.contents)
          ? parsed.data.contents
          : [parsed.data.contents];
        const contents = rawContents
          .map(getHoverValue)
          .flatMap((value) => value === null ? [] : [{ value }]);
        return {
          range: mapLspRange(parsed.data.range ?? {
            start: { line: position.lineNumber - 1, character: position.column - 1 },
            end: { line: position.lineNumber - 1, character: position.column },
          }),
          contents,
        };
      }
    }
  );

  const definitionDisposable = monaco.languages.registerDefinitionProvider(
    "lua",
    {
      async provideDefinition(model, position) {
        if (scriptLspClient.status !== "connected") return null;
        const result = await scriptLspClient.request("textDocument/definition", {
            textDocument: { uri: scriptLspClient.documentUri(model) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
        if (result.isErr()) return null;
        const parsed = lspLocationsSchema.safeParse(result.value);
        if (!parsed.success) return null;
        return Array.isArray(parsed.data)
          ? parsed.data.map(mapLspLocation)
          : mapLspLocation(parsed.data);
      }
    }
  );

  const referencesDisposable = monaco.languages.registerReferenceProvider(
    "lua",
    {
      async provideReferences(model, position, context) {
        if (scriptLspClient.status !== "connected") return null;
        const result = await scriptLspClient.request("textDocument/references", {
            textDocument: { uri: scriptLspClient.documentUri(model) },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context
          });
        if (result.isErr()) return null;
        const parsed = z.array(lspLocationSchema).safeParse(result.value);
        return parsed.success ? parsed.data.map(mapLspLocation) : null;
      }
    }
  );

  const symbolDisposable = monaco.languages.registerDocumentSymbolProvider(
    "lua",
    {
      async provideDocumentSymbols(model) {
        if (scriptLspClient.status !== "connected") return null;
        const result = await scriptLspClient.request("textDocument/documentSymbol", {
            textDocument: { uri: scriptLspClient.documentUri(model) }
          });
        if (result.isErr()) return null;
        const parsed = z.array(lspDocumentSymbolSchema).safeParse(result.value);
        return parsed.success ? parsed.data.map(mapDocumentSymbol) : null;
      }
    }
  );

  // Monitor model changes to send textDocument/didChange
  const contentChangeDisposable = monaco.editor.onDidCreateModel((model) => {
    if (model.getLanguageId() !== "lua") return;

    void scriptLspClient.notify("textDocument/didOpen", {
      textDocument: {
        uri: scriptLspClient.documentUri(model),
        languageId: "lua",
        version: 1,
        text: model.getValue()
      }
    }).match(() => undefined, () => undefined);

    const modelChangeSub = model.onDidChangeContent((e) => {
      void scriptLspClient.notify("textDocument/didChange", {
        textDocument: {
          uri: scriptLspClient.documentUri(model),
          version: model.getVersionId()
        },
        contentChanges: e.changes.map((c) => ({
          range: {
            start: { line: c.range.startLineNumber - 1, character: c.range.startColumn - 1 },
            end: { line: c.range.endLineNumber - 1, character: c.range.endColumn - 1 }
          },
          rangeLength: c.rangeLength,
          text: c.text
        }))
      }).match(() => undefined, () => undefined);
    });

    model.onWillDispose(() => {
      modelChangeSub.dispose();
      void scriptLspClient.notify("textDocument/didClose", {
        textDocument: { uri: scriptLspClient.documentUri(model) }
      }).match(() => undefined, () => undefined);
    });
  });

  return [
    completionDisposable,
    signatureHelpDisposable,
    hoverDisposable,
    definitionDisposable,
    referencesDisposable,
    symbolDisposable,
    contentChangeDisposable,
  ];
}
