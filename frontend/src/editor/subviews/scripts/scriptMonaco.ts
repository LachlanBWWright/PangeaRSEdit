import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { buildApiUrl } from "@/api/apiBase";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (_moduleId: string, label: string) => Worker;
    };
  }
}

let configured = false;

// Stream parser for Content-Length delimited JSON-RPC messages from stdio
class LspStreamParser {
  private buffer = "";
  public onMessage: (message: any) => void = () => {};

  public append(chunk: string) {
    this.buffer += chunk;
    this.parse();
  }

  private parse() {
    while (true) {
      const headerIndex = this.buffer.indexOf("Content-Length:");
      if (headerIndex === -1) break;

      const newlineIndex = this.buffer.indexOf("\r\n\r\n", headerIndex);
      if (newlineIndex === -1) break;

      const header = this.buffer.substring(headerIndex, newlineIndex);
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.substring(newlineIndex + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1]!, 10);
      const bodyStartIndex = newlineIndex + 4;
      if (this.buffer.length < bodyStartIndex + contentLength) {
        break;
      }

      const body = this.buffer.substring(bodyStartIndex, bodyStartIndex + contentLength);
      this.buffer = this.buffer.substring(bodyStartIndex + contentLength);

      try {
        const json = JSON.parse(body);
        this.onMessage(json);
      } catch (e) {
        console.error("Failed to parse LSP message body", e);
      }
    }
  }
}

class LspClient {
  private connection: HubConnection | null = null;
  private parser = new LspStreamParser();
  private nextRequestId = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  public status: "disconnected" | "connecting" | "connected" | "unavailable" = "disconnected";
  private gameId = "";
  private state: ScriptWorkspaceState | null = null;

  constructor() {
    this.parser.onMessage = (message) => {
      if (message.id !== undefined) {
        const pending = this.pendingRequests.get(message.id);
        if (pending) {
          this.pendingRequests.delete(message.id);
          if (message.error) {
            pending.reject(message.error);
          } else {
            pending.resolve(message.result);
          }
        }
      } else if (message.method === "textDocument/publishDiagnostics") {
        this.handlePublishDiagnostics(message.params);
      }
    };
  }

  public async connect(state: ScriptWorkspaceState): Promise<void> {
    if (this.status === "connected" && this.gameId === state.context.gameId) {
      return;
    }

    this.state = state;
    this.gameId = state.context.gameId;
    this.status = "connecting";

    try {
      const url = buildApiUrl("/api/lsp");
      this.connection = new HubConnectionBuilder()
        .withUrl(url, { withCredentials: true })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build();

      this.connection.on("ReceiveLspMessage", (text: string) => {
        this.parser.append(text);
      });

      this.connection.on("ReceiveLspError", (text: string) => {
        console.warn("LuaLS stderr:", text);
      });

      await this.connection.start();
      
      const success = await this.connection.invoke<boolean>("InitializeSession", this.gameId);
      if (!success) {
        this.status = "unavailable";
        return;
      }

      this.status = "connected";

      // Synchronize all workspace files
      await this.syncWorkspaceFiles();

      // Send standard LSP initialize request
      await this.sendLspRequest("initialize", {
        processId: null,
        rootUri: "file:///workspace",
        capabilities: {
          textDocument: {
            completion: { completionItem: { snippetSupport: true } },
            hover: {},
            definition: {},
            references: {},
            documentSymbol: {},
          }
        }
      });

      await this.sendLspNotification("initialized", {});
    } catch (e) {
      console.warn("LSP connection failed. Degrading to snippets.", e);
      this.status = "unavailable";
    }
  }

  public disconnect(): void {
    if (this.connection) {
      this.connection.stop();
      this.connection = null;
    }
    this.status = "disconnected";
    this.pendingRequests.clear();
  }

  private async syncWorkspaceFiles(): Promise<void> {
    if (!this.connection || !this.state) return;

    // Sync user source files
    for (const file of Object.values(this.state.sourceFiles)) {
      await this.connection.invoke("SyncFile", file.path, file.content);
    }

    // Sync generated declaration files
    const typeFiles = buildScriptTypeDeclarationFiles(this.state);
    for (const file of typeFiles) {
      await this.connection.invoke("SyncFile", file.path, file.content);
    }
  }

  public sendLspRequest(method: string, params: any): Promise<any> {
    if (this.status !== "connected" || !this.connection) {
      return Promise.reject(new Error("LSP client not connected"));
    }

    const id = ++this.nextRequestId;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params
    });
    const formatted = `Content-Length: ${payload.length}\r\n\r\n${payload}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.connection!.invoke("SendLspMessage", formatted).catch((err) => {
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  public sendLspNotification(method: string, params: any): Promise<void> {
    if (this.status !== "connected" || !this.connection) {
      return Promise.resolve();
    }

    const payload = JSON.stringify({
      jsonrpc: "2.0",
      method,
      params
    });
    const formatted = `Content-Length: ${payload.length}\r\n\r\n${payload}`;
    return this.connection.invoke("SendLspMessage", formatted);
  }

  private handlePublishDiagnostics(params: any) {
    const uri = params.uri;
    const model = monaco.editor.getModels().find((m) => m.uri.toString() === uri);
    if (!model) return;

    const markers = params.diagnostics.map((diag: any) => ({
      severity: diag.severity === 1 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
      message: diag.message,
      startLineNumber: diag.range.start.line + 1,
      startColumn: diag.range.start.character + 1,
      endLineNumber: diag.range.end.line + 1,
      endColumn: diag.range.end.character + 1
    }));

    monaco.editor.setModelMarkers(model, "luals", markers);
  }
}

export const lspClient = new LspClient();

function mapLspRange(range: any): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1
  };
}

function mapLspLocation(location: any): monaco.languages.Location {
  return {
    uri: monaco.Uri.parse(location.uri),
    range: mapLspRange(location.range)
  };
}

function mapLspCompletionItem(item: any, range: monaco.IRange): monaco.languages.CompletionItem {
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
    kind: kindMap[item.kind] ?? monaco.languages.CompletionItemKind.Property,
    detail: item.detail,
    documentation: item.documentation,
    insertText: item.insertText ?? item.label,
    range
  };
}

function buildCompletionItems(
  state: ScriptWorkspaceState,
  range: monaco.IRange,
): readonly monaco.languages.CompletionItem[] {
  const hookItems = state.context.supportedHooks.map((hookId) => ({
    label: hookId,
    kind: monaco.languages.CompletionItemKind.Snippet,
    range,
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: `Insert a ${hookId} hook using the current scripting runtime shape.`,
    insertText:
      hookId === "onObjectFrame"
        ? `function ${hookId}(ctx)\n  $0\nend\n`
        : hookId === "onTerrainItem"
          ? `function ${hookId}(ctx)\n  return { handled = false }\nend\n`
          : hookId === "onSplineItem"
            ? `function ${hookId}(ctx)\n  return { handled = false }\nend\n`
            : hookId === "onMapItem"
              ? `function ${hookId}(ctx)\n  return { handled = false }\nend\n`
              : `function ${hookId}(ctx)\n  $0\nend\n`,
  }));

  const apiItems = [
    {
      label: "pangea.log.info",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Log an informational message.",
      insertText: 'pangea.log.info("${1:message}")',
    },
    {
      label: "pangea.log.warn",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Log a warning message.",
      insertText: 'pangea.log.warn("${1:message}")',
    },
    {
      label: "pangea.log.error",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Log an error message.",
      insertText: 'pangea.log.error("${1:message}")',
    },
    {
      label: "pangea.object.position",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Read the current position for an object handle.",
      insertText: "pangea.object.position(${1:handle})",
    },
    {
      label: "pangea.object.setPosition",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Update an object handle position from Lua.",
      insertText: "pangea.object.setPosition(${1:handle}, { x = ${2:0}, y = ${3:0}, z = ${4:0} })",
    },
    {
      label: "pangea.spawn.native",
      kind: monaco.languages.CompletionItemKind.Function,
      range,
      documentation: "Spawn a native game object at a position.",
      insertText: 'pangea.spawn.native("${1:native-id}", { x = ${2:0}, y = ${3:0}, z = ${4:0} })',
    },
  ];

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

export function ensureScriptMonacoConfigured(): void {
  if (configured) {
    return;
  }

  window.MonacoEnvironment = {
    getWorker(_moduleId, _label) {
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

  // Try to connect to LSP in background
  lspClient.connect(state);

  const completionDisposable = monaco.languages.registerCompletionItemProvider(
    "lua",
    {
      triggerCharacters: [".", "\"", "("],
      async provideCompletionItems(model, position) {
        const range = buildCompletionRange(model, position);

        if (lspClient.status === "connected") {
          try {
            const result = await lspClient.sendLspRequest("textDocument/completion", {
              textDocument: { uri: model.uri.toString() },
              position: { line: position.lineNumber - 1, character: position.column - 1 }
            });

            if (result) {
              const items = Array.isArray(result) ? result : result.items || [];
              return {
                suggestions: items.map((item: any) => mapLspCompletionItem(item, range))
              };
            }
          } catch (e) {
            console.warn("LSP completion failed, falling back to snippets", e);
          }
        }

        // Fallback to snippets
        return {
          suggestions: [
            ...buildCompletionItems(state, range),
          ],
        };
      },
    },
  );

  const hoverDisposable = monaco.languages.registerHoverProvider(
    "lua",
    {
      async provideHover(model, position) {
        if (lspClient.status !== "connected") return null;

        try {
          const result = await lspClient.sendLspRequest("textDocument/hover", {
            textDocument: { uri: model.uri.toString() },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });

          if (result && result.contents) {
            const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
            return {
              range: mapLspRange(result.range || { start: { line: position.lineNumber - 1, character: position.column - 1 }, end: { line: position.lineNumber - 1, character: position.column } }),
              contents: contents.map((c: any) => typeof c === "string" ? { value: c } : { value: c.value })
            };
          }
        } catch { }
        return null;
      }
    }
  );

  const definitionDisposable = monaco.languages.registerDefinitionProvider(
    "lua",
    {
      async provideDefinition(model, position) {
        if (lspClient.status !== "connected") return null;

        try {
          const result = await lspClient.sendLspRequest("textDocument/definition", {
            textDocument: { uri: model.uri.toString() },
            position: { line: position.lineNumber - 1, character: position.column - 1 }
          });

          if (result) {
            if (Array.isArray(result)) {
              return result.map(mapLspLocation);
            }
            return mapLspLocation(result);
          }
        } catch { }
        return null;
      }
    }
  );

  const referencesDisposable = monaco.languages.registerReferenceProvider(
    "lua",
    {
      async provideReferences(model, position, context) {
        if (lspClient.status !== "connected") return null;

        try {
          const result = await lspClient.sendLspRequest("textDocument/references", {
            textDocument: { uri: model.uri.toString() },
            position: { line: position.lineNumber - 1, character: position.column - 1 },
            context
          });

          if (result && Array.isArray(result)) {
            return result.map(mapLspLocation);
          }
        } catch { }
        return null;
      }
    }
  );

  const symbolDisposable = monaco.languages.registerDocumentSymbolProvider(
    "lua",
    {
      async provideDocumentSymbols(model) {
        if (lspClient.status !== "connected") return null;

        try {
          const result = await lspClient.sendLspRequest("textDocument/documentSymbol", {
            textDocument: { uri: model.uri.toString() }
          });

          if (result && Array.isArray(result)) {
            // Map LSP DocumentSymbol to Monaco DocumentSymbol
            const mapSymbol = (sym: any): monaco.languages.DocumentSymbol => ({
              name: sym.name,
              detail: sym.detail || "",
              kind: sym.kind,
              tags: sym.tags || [],
              range: mapLspRange(sym.range),
              selectionRange: mapLspRange(sym.selectionRange),
              children: sym.children ? sym.children.map(mapSymbol) : []
            });
            return result.map(mapSymbol);
          }
        } catch { }
        return null;
      }
    }
  );

  // Monitor model changes to send textDocument/didChange
  const contentChangeDisposable = monaco.editor.onDidCreateModel((model) => {
    if (model.getModeId() !== "lua") return;

    lspClient.sendLspNotification("textDocument/didOpen", {
      textDocument: {
        uri: model.uri.toString(),
        languageId: "lua",
        version: 1,
        text: model.getValue()
      }
    });

    const modelChangeSub = model.onDidChangeContent((e) => {
      lspClient.sendLspNotification("textDocument/didChange", {
        textDocument: {
          uri: model.uri.toString(),
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
      });
    });

    model.onWillDispose(() => {
      modelChangeSub.dispose();
      lspClient.sendLspNotification("textDocument/didClose", {
        textDocument: { uri: model.uri.toString() }
      });
    });
  });

  return [
    completionDisposable,
    hoverDisposable,
    definitionDisposable,
    referencesDisposable,
    symbolDisposable,
    contentChangeDisposable
  ];
}
