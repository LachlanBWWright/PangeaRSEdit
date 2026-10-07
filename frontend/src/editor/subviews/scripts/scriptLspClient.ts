import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import * as monaco from "monaco-editor";
import { err, errAsync, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { buildApiUrl } from "@/api/apiBase";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";
import {
  lspMessageSchema,
  publishDiagnosticsParamsSchema,
} from "./scriptLspSchemas";
import type { ScriptDiagnostic, ScriptWorkspaceState } from "./scriptWorkspaceState";
import { scriptDecodedPath, scriptEditorPath, scriptEditorUri, scriptUriPath } from "./scriptEditorUris";

const VIRTUAL_WORKSPACE_URI = "file:///workspace/";
const REQUEST_TIMEOUT_MS = 10_000;

export interface LspClientError {
  readonly code: "connection" | "protocol" | "timeout" | "unavailable";
  readonly message: string;
}

interface PendingRequest {
  readonly resolve: (result: Result<unknown, LspClientError>) => void;
  readonly timeoutId: ReturnType<typeof setTimeout>;
}

export interface ScriptLspDiagnosticsEvent {
  readonly filePath: string;
  readonly diagnostics: readonly ScriptDiagnostic[];
}

const initializeCapabilitiesSchema = z.object({
  capabilities: z.object({
    documentFormattingProvider: z.union([z.boolean(), z.object({})]).optional(),
    renameProvider: z.union([z.boolean(), z.object({})]).optional(),
    signatureHelpProvider: z.object({}).optional(),
    completionProvider: z.object({resolveProvider: z.boolean().optional()}).optional(),
  }).optional(),
});

export interface ScriptLanguageCapabilities {
  readonly formatting: boolean;
  readonly rename: boolean;
  readonly signatureHelp: boolean;
  readonly completionResolve: boolean;
}

export interface ScriptLspDocument {
  readonly uri: { toString: () => string };
  getLanguageId: () => string;
  getVersionId: () => number;
  getValue: () => string;
}

const parseJson = Result.fromThrowable(
  JSON.parse,
  (): LspClientError => ({ code: "protocol", message: "LuaLS returned invalid JSON." }),
);

function connectionError(message: string): LspClientError {
  return { code: "connection", message };
}

function protocolError(message: string): LspClientError {
  return { code: "protocol", message };
}

export class ScriptLspClient {
  private connection: HubConnection | null = null;
  private nextRequestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private gameId = "";
  private state: ScriptWorkspaceState | null = null;
  private workspaceUri = "";
  private listeners = new Set<() => void>();
  private diagnosticListeners = new Set<(event: ScriptLspDiagnosticsEvent) => void>();
  private capabilities: ScriptLanguageCapabilities = { formatting: false, rename: false, signatureHelp: false, completionResolve: false };
  private connectionGeneration = 0;
  private connecting: ResultAsync<void, LspClientError> | null = null;
  private documentVersions = new Map<string, number>();
  private synchronizedFiles = new Map<string, string>();
  private declarationKey = "";
  private declarationFiles: readonly { readonly path: string; readonly content: string }[] = [];
  private openedDocuments = new Set<string>();
  private initialized = false;
  private syncQueue: Promise<void> = Promise.resolve();
  public status: "disconnected" | "connecting" | "connected" | "unavailable" =
    "disconnected";

  public connect(state: ScriptWorkspaceState): ResultAsync<void, LspClientError> {
    this.state = state;
    if (this.connecting !== null && this.gameId === state.context.gameId) return this.connecting;
    if (this.status === "connected" && this.gameId === state.context.gameId) {
      return this.syncWorkspaceFiles();
    }
    if (this.status === "connecting" && this.gameId === state.context.gameId) {
      return this.connecting ?? errAsync(connectionError("LuaLS is reconnecting."));
    }
    const generation = ++this.connectionGeneration;
    this.rejectPending(connectionError("LuaLS workspace changed."));
    const stopPrevious = this.connection === null
      ? ResultAsync.fromSafePromise(Promise.resolve())
      : this.stopConnection();

    this.gameId = state.context.gameId;
    this.setStatus("connecting");
    const result = stopPrevious.andThen(() => generation === this.connectionGeneration
      ? this.startConnection() : errAsync(connectionError("LuaLS workspace changed.")))
      .map(() => {if (generation === this.connectionGeneration) this.connecting = null;})
      .mapErr(error => {if (generation === this.connectionGeneration) {this.connecting = null; this.setStatus("unavailable");} return error;});
    this.connecting = result;
    return result;
  }

  public disconnect(): ResultAsync<void, LspClientError> {
    this.connectionGeneration++;
    this.connecting = null;
    this.setStatus("disconnected");
    this.rejectPending(connectionError("LuaLS connection closed."));
    return this.stopConnection();
  }

  public request(
    method: string,
    params: unknown,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<Result<unknown, LspClientError>> {
    if (this.status !== "connected" || this.connection === null) {
      return Promise.resolve(
        err({ code: "unavailable", message: "LuaLS is not connected." }),
      );
    }

    const id = ++this.nextRequestId;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(id);
        resolve(err({ code: "timeout", message: `${method} timed out.` }));
      }, Number.isFinite(timeoutMs) ? Math.min(REQUEST_TIMEOUT_MS, Math.max(1, timeoutMs)) : REQUEST_TIMEOUT_MS);
      this.pendingRequests.set(id, { resolve, timeoutId });
      void ResultAsync.fromPromise(
        this.connection?.invoke("SendLspPayload", payload) ?? Promise.resolve(),
        () => connectionError(`Failed to send ${method}.`),
      ).match(
        () => undefined,
        (sendError) => this.resolvePending(id, err(sendError)),
      );
    });
  }

  public notify(method: string, params: unknown): ResultAsync<void, LspClientError> {
    if (this.status !== "connected" || this.connection === null) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }
    const payload = JSON.stringify({ jsonrpc: "2.0", method, params });
    return ResultAsync.fromPromise(
      this.connection.invoke("SendLspPayload", payload),
      () => connectionError(`Failed to send ${method}.`),
    );
  }

  public getStatus(): ScriptLspClient["status"] {
    return this.status;
  }

  public getCapabilities(): ScriptLanguageCapabilities {
    return this.capabilities;
  }

  public isWorkspaceConnected(gameId: string): boolean {
    return this.status === "connected" && this.initialized && this.gameId === gameId;
  }

  public sourcePath(serverUri: string): string | null {
    if (this.workspaceUri.length > 0 && serverUri.startsWith(this.workspaceUri)) {
      return scriptDecodedPath(serverUri.slice(this.workspaceUri.length));
    }
    const scopedPath = scriptEditorPath(serverUri, this.gameId);
    if (scopedPath !== null) return scopedPath;
    const uri = this.clientUri(serverUri).toString();
    if (!uri.startsWith(VIRTUAL_WORKSPACE_URI)) return null;
    return scriptDecodedPath(uri.slice(VIRTUAL_WORKSPACE_URI.length));
  }

  public trackDocumentContent(model: ScriptLspDocument): void {
    const path = this.sourcePath(model.uri.toString());
    if (scriptEditorPath(model.uri.toString(), this.gameId) === null) return;
    if (path) this.documentVersions.set(path, model.getVersionId());
    if (this.status === "connected" && path) this.synchronizedFiles.set(path, model.getValue());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeDiagnostics(
    listener: (event: ScriptLspDiagnosticsEvent) => void,
  ): () => void {
    this.diagnosticListeners.add(listener);
    return () => this.diagnosticListeners.delete(listener);
  }

  public documentUri(model: Pick<ScriptLspDocument, "uri">): string {
    const modelUri = model.uri.toString();
    const path = scriptEditorPath(modelUri, this.gameId);
    if (path !== null && this.workspaceUri.length > 0) return `${this.workspaceUri}${scriptUriPath(path)}`;
    if (!modelUri.startsWith(VIRTUAL_WORKSPACE_URI) || this.workspaceUri.length === 0) {
      return modelUri;
    }
    return `${this.workspaceUri}${modelUri.slice(VIRTUAL_WORKSPACE_URI.length)}`;
  }

  public clientUri(serverUri: string): monaco.Uri {
    if (this.workspaceUri.length > 0 && serverUri.startsWith(this.workspaceUri)) {
      const path = scriptDecodedPath(serverUri.slice(this.workspaceUri.length));
      if (path === null) return monaco.Uri.parse(serverUri);
      return monaco.Uri.parse(
        scriptEditorUri(this.gameId, path),
      );
    }
    return monaco.Uri.parse(serverUri);
  }

  private startConnection(): ResultAsync<void, LspClientError> {
    const connection = new HubConnectionBuilder()
      .withUrl(buildApiUrl("/api/lsp"), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build();
    this.connection = connection;
    connection.on("ReceiveLspPayload", (payload: string) => {if (this.connection === connection) this.receive(payload);});
    connection.on("ReceiveLspError", (text: string) => console.warn("LuaLS:", text));
    connection.onreconnecting(() => {
      if (this.connection !== connection) return;
      this.initialized = false;
      this.setStatus("connecting");
      this.rejectPending(connectionError("LuaLS is reconnecting."));
    });
    connection.onreconnected(() => {
      if (this.connection !== connection) return;
      this.setStatus("connecting");
      void this.initializeSession().match(
        () => undefined,
        () => { if (this.connection === connection) this.setStatus("unavailable"); },
      );
    });
    connection.onclose(() => {
      if (this.connection !== connection) return;
      this.initialized = false;
      this.setStatus("unavailable");
      this.rejectPending(connectionError("LuaLS connection closed."));
    });

    return ResultAsync.fromPromise(
      connection.start(),
      () => connectionError("Could not connect to LuaLS."),
    ).andThen(() => this.connection === connection ? this.initializeSession() : errAsync(connectionError("LuaLS workspace changed.")));
  }

  private initializeSession(): ResultAsync<void, LspClientError> {
    if (this.connection === null) {
      return errAsync(connectionError("LuaLS connection is missing."));
    }
    const connection = this.connection;
    const gameId = this.gameId;

    this.synchronizedFiles.clear();
    this.openedDocuments.clear();
    this.initialized = false;
    this.capabilities = { formatting: false, rename: false, signatureHelp: false, completionResolve: false };
    return ResultAsync.fromPromise(
      connection.invoke<unknown>("InitializeSession", gameId),
      () => connectionError("LuaLS session initialization failed."),
    )
      .andThen((workspaceUri) => {
        if (this.connection !== connection || this.gameId !== gameId) return err(connectionError("LuaLS workspace changed."));
        const parsed = z.string().url().safeParse(workspaceUri);
        if (!parsed.success) {
          return err(protocolError("LuaLS returned an invalid workspace URI."));
        }
        this.workspaceUri = parsed.data.endsWith("/") ? parsed.data : `${parsed.data}/`;
        this.setStatus("connected");
        return ok(undefined);
      })
      .andThen(() => this.syncWorkspaceFiles())
      .andThen(() => ResultAsync.fromSafePromise(this.request("initialize", {
        processId: null,
        rootUri: this.workspaceUri,
        workspaceFolders: [{ uri: this.workspaceUri, name: "Pangea Scripts" }],
        capabilities: {
          textDocument: {
            completion: {
              completionItem: {
                snippetSupport: true,
                labelDetailsSupport: true,
                insertReplaceSupport: true,
                documentationFormat: ["markdown", "plaintext"],
                resolveSupport: { properties: ["documentation", "detail", "additionalTextEdits"] },
              },
              completionList: { itemDefaults: ["commitCharacters", "editRange", "insertTextFormat", "insertTextMode", "data"] },
            },
            signatureHelp: {signatureInformation: {documentationFormat: ["markdown", "plaintext"], parameterInformation: {labelOffsetSupport: true}}},
            hover: {},
            definition: { linkSupport: true },
            references: {},
            documentSymbol: {},
            formatting: {},
            rename: { prepareSupport: false },
            publishDiagnostics: { versionSupport: true },
          },
          workspace: { workspaceFolders: true },
        },
      })))
      .andThen((initializeResult) => initializeResult)
      .andThen((result) => {
        if (this.connection !== connection) return err(connectionError("LuaLS workspace changed."));
        const parsed = initializeCapabilitiesSchema.safeParse(result);
        if (!parsed.success) return err(protocolError("LuaLS returned invalid capabilities."));
        const supported = parsed.data.capabilities;
        this.capabilities = {
          formatting: supported?.documentFormattingProvider !== undefined && supported.documentFormattingProvider !== false,
          rename: supported?.renameProvider !== undefined && supported.renameProvider !== false,
          signatureHelp: supported?.signatureHelpProvider !== undefined,
          completionResolve: supported?.completionProvider?.resolveProvider === true,
        };
        for (const listener of this.listeners) listener();
        return this.notify("initialized", {});
      })
      .andThen(() => {
        if (this.connection !== connection) return err(connectionError("LuaLS workspace changed."));
        this.initialized = true;
        this.openExistingDocuments();
        return ok(undefined);
      });
  }

  private syncWorkspaceFiles(): ResultAsync<void, LspClientError> {
    const result = ResultAsync.fromSafePromise(this.syncQueue).andThen(() => this.syncWorkspaceFilesNow());
    this.syncQueue = result.match(() => undefined, () => undefined);
    return result;
  }

  private syncWorkspaceFilesNow(): ResultAsync<void, LspClientError> {
    if (this.connection === null || this.state === null) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }
    const connection = this.connection;
    const key = JSON.stringify({
      game: this.state.context.gameId, hooks: this.state.context.supportedHooks,
      tags: this.state.context.allowedTags,
      contributedTags: this.state.behaviorCatalog.map((behavior) => behavior.contributedTags),
      objects: this.state.customObjects.map((definition) => definition.id),
      parameters: this.state.params,
    });
    if (key !== this.declarationKey) {
      this.declarationFiles = buildScriptTypeDeclarationFiles(this.state);
      this.declarationKey = key;
    }
    const files = [
      ...Object.values(this.state.sourceFiles),
      ...this.declarationFiles,
    ];
    const paths = new Set(files.map((file) => file.path));
    const removals = [...this.synchronizedFiles.keys()].filter((path) => !paths.has(path));
    const deleteFiles = removals.reduce<ResultAsync<void, LspClientError>>(
      (result, path) => result.andThen(() => this.connection === connection && this.openedDocuments.has(path)
        ? this.notify("textDocument/didClose", {textDocument: {uri: `${this.workspaceUri}${scriptUriPath(path)}`}}) : ok(undefined))
      .andThen(() => ResultAsync.fromPromise(
        this.connection === connection ? connection.invoke("DeleteFile", path) : Promise.resolve(),
        () => connectionError(`Failed to remove ${path} from LuaLS.`),
      ).map(() => { if (this.connection === connection) {this.synchronizedFiles.delete(path); this.openedDocuments.delete(path); this.documentVersions.delete(path);} })),
      ResultAsync.fromSafePromise(Promise.resolve()),
    );
    return files.filter((file) => this.synchronizedFiles.get(file.path) !== file.content).reduce<ResultAsync<void, LspClientError>>(
      (result, file) => result.andThen(() => ResultAsync.fromPromise(
        this.connection === connection ? connection.invoke("SyncFile", file.path, file.content) : Promise.resolve(),
        () => connectionError(`Failed to synchronize ${file.path}.`),
      ).map(() => { if (this.connection === connection) this.synchronizedFiles.set(file.path, file.content); })),
      deleteFiles,
    );
  }

  private openExistingDocuments(): void {
    for (const model of monaco.editor.getModels()) {
      this.openDocument(model);
    }
  }

  public openDocument(model: ScriptLspDocument): void {
    const path = scriptEditorPath(model.uri.toString(), this.gameId);
    if (!path || !this.initialized || this.status !== "connected" || model.getLanguageId() !== "lua" || this.openedDocuments.has(path)
      || (!this.state?.sourceFiles[path] && !this.state?.compiledFiles[path] && !this.declarationFiles.some(file => file.path === path))) return;
    this.openedDocuments.add(path);
    const connection = this.connection;
    this.trackDocumentContent(model);
    void this.notify("textDocument/didOpen", { textDocument: { uri: this.documentUri(model), languageId: "lua", version: model.getVersionId(), text: model.getValue() } }).mapErr(error => {if (this.connection === connection) { this.openedDocuments.delete(path); this.synchronizedFiles.delete(path); } return error;});
  }

  public changeDocument(model: ScriptLspDocument, event: Pick<monaco.editor.IModelContentChangedEvent, "changes">): void {
    const path = scriptEditorPath(model.uri.toString(), this.gameId);
    if (!path || !this.initialized || this.status !== "connected") return;
    this.trackDocumentContent(model);
    if (!this.openedDocuments.has(path)) { this.openDocument(model); return; }
    const connection = this.connection;
    void this.notify("textDocument/didChange", {
      textDocument: { uri: this.documentUri(model), version: model.getVersionId() },
      contentChanges: event.changes.map((change) => ({
        range: { start: { line: change.range.startLineNumber - 1, character: change.range.startColumn - 1 }, end: { line: change.range.endLineNumber - 1, character: change.range.endColumn - 1 } },
        rangeLength: change.rangeLength, text: change.text,
      })),
    }).mapErr(error => { if (this.connection === connection) { this.openedDocuments.delete(path); this.synchronizedFiles.delete(path); } return error; });
  }

  public closeDocument(model: ScriptLspDocument): void {
    const path = scriptEditorPath(model.uri.toString(), this.gameId);
    if (!path || !this.openedDocuments.delete(path)) return;
    void this.notify("textDocument/didClose", { textDocument: { uri: this.documentUri(model) } });
  }

  private receive(payload: string): void {
    const parsedJson = parseJson(payload);
    if (parsedJson.isErr()) return;
    const parsedMessage = lspMessageSchema.safeParse(parsedJson.value);
    if (!parsedMessage.success) return;
    const message = parsedMessage.data;
    if (message.id !== undefined) {
      this.resolvePending(
        message.id,
        message.error === undefined
          ? ok(message.result)
          : err(protocolError("LuaLS request failed.")),
      );
      return;
    }
    if (message.method === "textDocument/publishDiagnostics") {
      this.publishDiagnostics(message.params);
    }
  }

  private publishDiagnostics(params: unknown): void {
    const parsed = publishDiagnosticsParamsSchema.extend({version: z.number().int().optional()}).safeParse(params);
    if (!parsed.success) return;
    if (scriptEditorPath(parsed.data.uri, this.gameId) === null && !parsed.data.uri.startsWith(this.workspaceUri)) return;
    const clientUri = this.clientUri(parsed.data.uri).toString();
    if (!clientUri.startsWith(VIRTUAL_WORKSPACE_URI)) return;
    const filePath = this.sourcePath(parsed.data.uri);
    if (filePath === null) return;
    if (filePath.length === 0) return;
    if (!this.state?.sourceFiles[filePath] && !this.declarationFiles.some(file => file.path === filePath)) return;
    const version = this.documentVersions.get(filePath);
    if (parsed.data.version !== undefined && version !== undefined && parsed.data.version !== version) return;
    const diagnostics: ScriptDiagnostic[] = parsed.data.diagnostics.map((diagnostic) => ({
      category: "luals",
      severity: diagnostic.severity === 1 ? "error" : "warning",
      message: diagnostic.message,
      code: "luals",
      filePath,
      line: diagnostic.range.start.line + 1,
      column: diagnostic.range.start.character + 1,
    }));
    const event: ScriptLspDiagnosticsEvent = { filePath, diagnostics };
    for (const listener of this.diagnosticListeners) listener(event);

    const uri = clientUri;
    const model = monaco.editor.getModels().find(
      (candidate) => candidate.uri.toString() === uri,
    );
    if (model === undefined) return;
    monaco.editor.setModelMarkers(
      model,
      "luals",
      parsed.data.diagnostics.map((diagnostic) => ({
        severity: diagnostic.severity === 1
          ? monaco.MarkerSeverity.Error
          : diagnostic.severity === 2
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
        message: diagnostic.message,
        startLineNumber: diagnostic.range.start.line + 1,
        startColumn: diagnostic.range.start.character + 1,
        endLineNumber: diagnostic.range.end.line + 1,
        endColumn: diagnostic.range.end.character + 1,
      })),
    );
  }

  private resolvePending(
    id: number,
    result: Result<unknown, LspClientError>,
  ): void {
    const pending = this.pendingRequests.get(id);
    if (pending === undefined) return;
    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(id);
    pending.resolve(result);
  }

  private rejectPending(error: LspClientError): void {
    for (const id of this.pendingRequests.keys()) {
      this.resolvePending(id, err(error));
    }
  }

  private stopConnection(): ResultAsync<void, LspClientError> {
    const connection = this.connection;
    this.connection = null;
    this.initialized = false;
    this.workspaceUri = "";
    this.openedDocuments.clear();
    this.documentVersions.clear();
    this.synchronizedFiles.clear();
    if (connection === null) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }
    return ResultAsync.fromPromise(
      connection.stop(),
      () => connectionError("LuaLS connection did not stop cleanly."),
    );
  }

  private setStatus(status: ScriptLspClient["status"]): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }
}

export const scriptLspClient = new ScriptLspClient();
