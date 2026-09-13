import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { z } from "zod";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { hasConfiguredApiEndpoint } from "@/api/apiBase";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { getAvailableApiFunctions } from "./scriptApiAvailability";
import { scriptLspClient } from "./scriptLspClient";
import {
  buildApiCompletionInsertText,
  buildApiSignature,
  buildNativeIdSnippet,
  getContextualApiName,
  nativeIdInsertText,
} from "./scriptCompletionText";
import type { ApiFunction } from "./scriptApiSchema";
import type {
  LspCompletionItem,
  LspDocumentSymbol,
  LspLocation,
  LspRange,
} from "./scriptLspSchemas";
import {
  lspCompletionResultSchema,
  lspDocumentSymbolSchema,
  lspHoverSchema,
  lspLocationSchema,
  lspLocationsSchema,
} from "./scriptLspSchemas";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

let configured = false;

function mapLspRange(range: LspRange): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1
  };
}

function mapLspLocation(location: LspLocation): monaco.languages.Location {
  return {
    uri: scriptLspClient.clientUri(location.uri),
    range: mapLspRange(location.range)
  };
}

function mapLspCompletionItem(
  item: LspCompletionItem,
  range: monaco.IRange,
): monaco.languages.CompletionItem {
  const kindMap: Record<number, number> = {
    1: monaco.languages.CompletionItemKind.Text,
    2: monaco.languages.CompletionItemKind.Method,
    3: monaco.languages.CompletionItemKind.Function,
    4: monaco.languages.CompletionItemKind.Constructor,
    5: monaco.languages.CompletionItemKind.Field,
    6: monaco.languages.CompletionItemKind.Variable,
    7: monaco.languages.CompletionItemKind.Class,
    8: monaco.languages.CompletionItemKind.Interface,
    9: monaco.languages.CompletionItemKind.Module,
    10: monaco.languages.CompletionItemKind.Property,
    11: monaco.languages.CompletionItemKind.Unit,
    12: monaco.languages.CompletionItemKind.Value,
    13: monaco.languages.CompletionItemKind.Enum,
    14: monaco.languages.CompletionItemKind.Keyword,
    15: monaco.languages.CompletionItemKind.Snippet,
    16: monaco.languages.CompletionItemKind.Color,
    17: monaco.languages.CompletionItemKind.File,
    18: monaco.languages.CompletionItemKind.Reference,
    19: monaco.languages.CompletionItemKind.Folder,
    20: monaco.languages.CompletionItemKind.EnumMember,
    21: monaco.languages.CompletionItemKind.Constant,
    22: monaco.languages.CompletionItemKind.Struct,
    23: monaco.languages.CompletionItemKind.Event,
    24: monaco.languages.CompletionItemKind.Operator,
    25: monaco.languages.CompletionItemKind.TypeParameter
  };

  return {
    label: item.label,
    kind: item.kind === undefined
      ? monaco.languages.CompletionItemKind.Property
      : kindMap[item.kind] ?? monaco.languages.CompletionItemKind.Property,
    detail: item.detail,
    documentation: item.documentation,
    insertText: item.insertText ?? item.label,
    range
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
  state: ScriptWorkspaceState,
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  range: monaco.IRange,
): readonly monaco.languages.CompletionItem[] {
  const getHookContextType = (hookId: string): string => {
    const hook = SCRIPTING_CONTRACT.api.hooks.find(
      (candidate) => candidate.name === hookId,
    );
    return hook?.contextType ?? "LevelContext";
  };
  const buildHookSnippet = (
    hookId: string,
    body: string,
  ): string =>
    `---@param ctx ${getHookContextType(hookId)}\nfunction ${hookId}(ctx)\n  ${body}\nend\n`;

  const hookItems = state.context.supportedHooks.map((hookId) => ({
    label: hookId,
    kind: monaco.languages.CompletionItemKind.Snippet,
    range,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: `Insert a ${hookId} hook using the current scripting runtime shape.`,
    insertText:
      hookId === "onObjectFrame"
        ? buildHookSnippet(hookId, "$0")
        : hookId === "onTerrainItem"
          ? buildHookSnippet(hookId, "return { handled = false }")
          : hookId === "onSplineItem"
            ? buildHookSnippet(hookId, "return { handled = false }")
            : hookId === "onMapItem"
              ? buildHookSnippet(hookId, "return { handled = false }")
              : buildHookSnippet(hookId, "$0"),
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
  state: ScriptWorkspaceState,
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
  state: ScriptWorkspaceState,
): readonly monaco.IDisposable[] {
  ensureScriptMonacoConfigured();

  if (hasConfiguredApiEndpoint()) {
    void scriptLspClient.connect(state).match(
      () => undefined,
      () => undefined,
    );
  }

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
                suggestions: items.map((item) => mapLspCompletionItem(item, range)),
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
    },
  );

  const signatureHelpDisposable = monaco.languages.registerSignatureHelpProvider(
    "lua",
    {
      signatureHelpTriggerCharacters: ["(", ","],
      signatureHelpRetriggerCharacters: [",", ")"],
      provideSignatureHelp(model, position) {
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
        if (scriptLspClient.status !== "connected") return null;
        const result = await scriptLspClient.request("textDocument/hover", {
            textDocument: { uri: scriptLspClient.documentUri(model) },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });
        if (result.isErr()) return null;
        const parsed = lspHoverSchema.safeParse(result.value);
        if (!parsed.success) return null;
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
    {
      dispose: () => {
        void scriptLspClient.disconnect().match(
          () => undefined,
          () => undefined,
        );
      },
    },
  ];
}
