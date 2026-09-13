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
  public status: "disconnected" | "connecting" | "connected" | "unavailable" =
    "disconnected";

  public connect(state: ScriptWorkspaceState): ResultAsync<void, LspClientError> {
    this.state = state;
    if (this.status === "connected" && this.gameId === state.context.gameId) {
      return this.syncWorkspaceFiles();
    }
    if (this.status === "connecting" && this.gameId === state.context.gameId) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }

    const stopPrevious = this.connection === null
      ? ResultAsync.fromSafePromise(Promise.resolve())
      : this.stopConnection();

    this.gameId = state.context.gameId;
    this.setStatus("connecting");
    return stopPrevious.andThen(() => this.startConnection());
  }

  public disconnect(): ResultAsync<void, LspClientError> {
    this.setStatus("disconnected");
    this.rejectPending(connectionError("LuaLS connection closed."));
    return this.stopConnection();
  }

  public request(
    method: string,
    params: unknown,
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
      }, REQUEST_TIMEOUT_MS);
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

  public documentUri(model: monaco.editor.ITextModel): string {
    const modelUri = model.uri.toString();
    if (!modelUri.startsWith(VIRTUAL_WORKSPACE_URI) || this.workspaceUri.length === 0) {
      return modelUri;
    }
    return `${this.workspaceUri}${modelUri.slice(VIRTUAL_WORKSPACE_URI.length)}`;
  }

  public clientUri(serverUri: string): monaco.Uri {
    if (this.workspaceUri.length > 0 && serverUri.startsWith(this.workspaceUri)) {
      return monaco.Uri.parse(
        `${VIRTUAL_WORKSPACE_URI}${serverUri.slice(this.workspaceUri.length)}`,
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
    connection.on("ReceiveLspPayload", (payload: string) => this.receive(payload));
    connection.on("ReceiveLspError", (text: string) => console.warn("LuaLS:", text));
    connection.onreconnecting(() => {
      this.setStatus("connecting");
      this.rejectPending(connectionError("LuaLS is reconnecting."));
    });
    connection.onreconnected(() => {
      this.setStatus("connecting");
      void this.initializeSession().match(
        () => undefined,
        () => this.setStatus("unavailable"),
      );
    });
    connection.onclose(() => {
      this.setStatus("unavailable");
      this.rejectPending(connectionError("LuaLS connection closed."));
    });

    return ResultAsync.fromPromise(
      connection.start(),
      () => connectionError("Could not connect to LuaLS."),
    ).andThen(() => this.initializeSession());
  }

  private initializeSession(): ResultAsync<void, LspClientError> {
    if (this.connection === null) {
      return errAsync(connectionError("LuaLS connection is missing."));
    }

    return ResultAsync.fromPromise(
      this.connection.invoke<unknown>("InitializeSession", this.gameId),
      () => connectionError("LuaLS session initialization failed."),
    )
      .andThen((workspaceUri) => {
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
            completion: { completionItem: { snippetSupport: true } },
            hover: {},
            definition: {},
            references: {},
            documentSymbol: {},
            publishDiagnostics: {},
          },
          workspace: { workspaceFolders: true },
        },
      })))
      .andThen((initializeResult) => initializeResult)
      .andThen(() => this.notify("initialized", {}))
      .andThen(() => {
        this.openExistingDocuments();
        return ok(undefined);
      });
  }

  private syncWorkspaceFiles(): ResultAsync<void, LspClientError> {
    if (this.connection === null || this.state === null) {
      return ResultAsync.fromSafePromise(Promise.resolve());
    }
    const files = [
      ...Object.values(this.state.sourceFiles),
      ...buildScriptTypeDeclarationFiles(this.state),
    ];
    return files.reduce<ResultAsync<void, LspClientError>>(
      (result, file) => result.andThen(() => ResultAsync.fromPromise(
        this.connection?.invoke("SyncFile", file.path, file.content) ?? Promise.resolve(),
        () => connectionError(`Failed to synchronize ${file.path}.`),
      )),
      ResultAsync.fromSafePromise(Promise.resolve()),
    );
  }

  private openExistingDocuments(): void {
    for (const model of monaco.editor.getModels()) {
      if (model.getLanguageId() !== "lua") continue;
      void this.notify("textDocument/didOpen", {
        textDocument: {
          uri: this.documentUri(model),
          languageId: "lua",
          version: model.getVersionId(),
          text: model.getValue(),
        },
      });
    }
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
    const parsed = publishDiagnosticsParamsSchema.safeParse(params);
    if (!parsed.success) return;
    const clientUri = this.clientUri(parsed.data.uri).toString();
    if (!clientUri.startsWith(VIRTUAL_WORKSPACE_URI)) return;
    const filePath = clientUri.slice(VIRTUAL_WORKSPACE_URI.length);
    if (filePath.length === 0) return;
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
