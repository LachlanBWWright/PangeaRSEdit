import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { ScriptLspDocument } from "./scriptLspClient";

const retainedModels = vi.hoisted(() => {const models: ScriptLspDocument[] = []; return models;});

const fakeTransports = vi.hoisted(() => {
  const sessions: {publish: (payload: string) => void; close: () => void; reconnecting: () => void; reconnected: () => void}[] = [];
  return sessions;
});

const transportCalls = vi.hoisted(() => {
  const calls: { method: string; args: readonly string[] }[] = [];
  return calls;
});

vi.mock("@microsoft/signalr", () => {
  class FakeConnection {
    private payloadHandler: ((payload: string) => void) | undefined;
    private closeHandler: (() => void) | undefined;
    private reconnectingHandler: (() => void) | undefined;
    private reconnectedHandler: (() => void) | undefined;

    constructor() {fakeTransports.push({publish: payload => this.payloadHandler?.(payload), close: () => this.closeHandler?.(), reconnecting: () => this.reconnectingHandler?.(), reconnected: () => this.reconnectedHandler?.()});}

    public on(
      method: string,
      handler: (payload: string) => void,
    ): void {
      if (method === "ReceiveLspPayload") {
        this.payloadHandler = handler;
      }
    }

    public onreconnecting(handler: () => void): void {
      this.reconnectingHandler = handler;
    }

    public onreconnected(handler: () => void): void {
      this.reconnectedHandler = handler;
    }

    public onclose(handler: () => void): void {
      this.closeHandler = handler;
    }

    public start(): Promise<void> {
      return Promise.resolve();
    }

    public stop(): Promise<void> {
      return Promise.resolve();
    }

    public invoke(method: string, ...args: string[]): Promise<unknown> {
      transportCalls.push({ method, args });
      if (method === "InitializeSession") {
        return Promise.resolve(
          args[0] === "invalid-uri" ? "not a URI" : "https://luals.test/workspace",
        );
      }
      if (method !== "SendLspPayload") {
        return Promise.resolve(undefined);
      }

      const payload = args[0] ?? "";
      if (payload.includes('"method":"slow"')) {
        return Promise.resolve(undefined);
      }
      if (payload.includes('"method":"fail"')) {
        return Promise.reject(new Error("send failed"));
      }
      if (payload.includes('"method":"bad"')) {
        this.payloadHandler?.("not-json");
        return Promise.resolve(undefined);
      }
      if (payload.includes('"method":"publish"')) {
        this.payloadHandler?.(JSON.stringify({
          jsonrpc: "2.0",
          method: "textDocument/publishDiagnostics",
          params: {
            uri: "https://luals.test/workspace/main.lua",
            diagnostics: [{
              range: {
                start: { line: 2, character: 4 },
                end: { line: 2, character: 8 },
              },
              severity: 1,
              message: "bad value",
            }],
          },
        }));
        return Promise.resolve(undefined);
      }

      const id = /"id":(\d+)/.exec(payload)?.[1] ?? "0";
      const response = JSON.stringify({
        jsonrpc: "2.0",
        id: Number(id),
        result: payload.includes('"method":"initialize"')
          ? { capabilities: { documentFormattingProvider: true, renameProvider: { prepareProvider: false } } }
          : payload.includes('"method":"second"') ? "second" : {},
      });
      const delay = payload.includes('"method":"first"') ? 20 : 0;
      setTimeout(() => this.payloadHandler?.(response), delay);
      return Promise.resolve(undefined);
    }
  }

  class FakeHubConnectionBuilder {
    public withUrl(url: string, options: unknown): this {
      void url;
      void options;
      return this;
    }

    public withAutomaticReconnect(): this {
      return this;
    }

    public configureLogging(level: unknown): this {
      void level;
      return this;
    }

    public build(): FakeConnection {
      return new FakeConnection();
    }
  }

  return {
    HubConnectionBuilder: FakeHubConnectionBuilder,
    LogLevel: { None: 0 },
  };
});

vi.mock("monaco-editor", () => ({
  Uri: {
    parse: (value: string) => ({ toString: () => value }),
  },
  MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
  editor: {
    getModels: () => retainedModels,
    setModelMarkers: vi.fn(),
  },
}));

function makeState(gameId = "cromagrally"): ScriptWorkspaceState {
  return {
    projectVersion: 1,
    context: {
      gameId,
      gameLabel: "Cro-Mag Rally",
      levelNumber: 1,
      levelKey: "level-1",
      supportedHooks: [],
      allowedTags: [],
    },
    activeFilePath: "main.lua",
    behaviorCatalog: [],
    moduleOrder: [],
    sourceFiles: {
      "main.lua": {
        path: "main.lua",
        content: "return {}",
        savedContent: "return {}",
        language: "lua",
        readOnly: false,
        role: "user",
      },
    },
    compiledFiles: {},
    customObjects: [],
    params: [],
    assets: {},
    diagnostics: [],
    statusLog: [],
    sampleId: null,
    levels: {},
  };
}

describe("ScriptLspClient", () => {
  it("shares pending initialization and exposes readiness only for the initialized game", async () => {
    vi.useFakeTimers();
    const {ScriptLspClient} = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const first = client.connect(makeState());
    const second = client.connect(makeState());
    expect(client.isWorkspaceConnected("cromagrally")).toBe(false);
    await vi.advanceTimersByTimeAsync(0);
    expect((await first).isOk()).toBe(true);
    expect((await second).isOk()).toBe(true);
    expect(transportCalls.filter(call => call.method === "InitializeSession")).toHaveLength(1);
    expect(client.isWorkspaceConnected("cromagrally")).toBe(true);
    expect(client.isWorkspaceConnected("another-game")).toBe(false);
    await client.disconnect();
    expect(client.isWorkspaceConnected("cromagrally")).toBe(false);
  });

  it("ignores retired transport callbacks and rejects pending requests when switching games", async () => {
    const {ScriptLspClient} = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    await client.connect(makeState());
    const pending = client.request("slow", {});
    const previous = fakeTransports[0];
    await client.connect(makeState("another-game"));
    expect((await pending).isErr()).toBe(true);
    previous?.close(); previous?.reconnecting(); previous?.reconnected();
    expect(client.isWorkspaceConnected("another-game")).toBe(true);
    expect(transportCalls.filter(call => call.method === "InitializeSession")).toHaveLength(2);
  });

  it("reopens retained documents after reconnect and closes deleted documents before deleting their files", async () => {
    const {ScriptLspClient} = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const state = makeState();
    retainedModels.push({uri: {toString: () => "file:///workspace/cromagrally/main.lua"}, getLanguageId: () => "lua", getVersionId: () => 3, getValue: () => "return {}"});
    await client.connect(state);
    expect(transportCalls.filter(call => call.args[0]?.includes('"method":"textDocument/didOpen"'))).toHaveLength(1);
    fakeTransports[0]?.reconnecting();
    expect(client.isWorkspaceConnected("cromagrally")).toBe(false);
    fakeTransports[0]?.reconnected();
    await vi.waitFor(() => expect(client.isWorkspaceConnected("cromagrally")).toBe(true));
    expect(transportCalls.filter(call => call.args[0]?.includes('"method":"textDocument/didOpen"'))).toHaveLength(2);
    transportCalls.length = 0;
    await client.connect({...state, sourceFiles: {}});
    expect(transportCalls[0]?.args[0]).toContain('"method":"textDocument/didClose"');
    expect(transportCalls[1]?.method).toBe("DeleteFile");
  });

  it("drops stale document versions, foreign workspace diagnostics and diagnostics for removed files", async () => {
    const {ScriptLspClient} = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const events = vi.fn();
    client.subscribeDiagnostics(events);
    await client.connect(makeState());
    client.openDocument({uri: {toString: () => "file:///workspace/cromagrally/main.lua"}, getLanguageId: () => "lua", getVersionId: () => 3, getValue: () => "return {}"});
    const publish = (uri: string, version: number) => fakeTransports[0]?.publish(JSON.stringify({jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: {uri, version, diagnostics: []}}));
    publish("https://luals.test/workspace/main.lua", 2);
    publish("https://luals.test/workspace/main.lua", 9);
    publish("file:///workspace/another-game/main.lua", 3);
    expect(events).not.toHaveBeenCalled();
    publish("https://luals.test/workspace/main.lua", 3);
    expect(events).toHaveBeenCalledTimes(1);
    await client.connect({...makeState(), sourceFiles: {}});
    publish("https://luals.test/workspace/main.lua", 3);
    expect(events).toHaveBeenCalledTimes(1);
  });

  it("uses bounded shorter request timeouts without stalling offline fallback", async () => {
    vi.useFakeTimers();
    const {ScriptLspClient} = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const connecting = client.connect(makeState());
    await vi.advanceTimersByTimeAsync(0);
    await connecting;
    const pending = client.request("slow", {}, 1500);
    await vi.advanceTimersByTimeAsync(1500);
    expect((await pending).isErr()).toBe(true);
  });

  beforeEach(() => {
    vi.useRealTimers();
    transportCalls.length = 0;
    fakeTransports.length = 0;
    retainedModels.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects, synchronizes files, opens with the expected workspace, and notifies subscribers", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);

    const result = await client.connect(makeState());

    expect(result.isOk()).toBe(true);
    expect(client.getStatus()).toBe("connected");
    const initialization = transportCalls.find(call => call.args[0]?.includes('"method":"initialize"'))?.args[0] ?? "";
    for (const capability of ["labelDetailsSupport", "insertReplaceSupport", "documentationFormat", "itemDefaults", "linkSupport", "versionSupport"]) {
      expect(initialization).toContain(capability);
    }
    expect(listener).toHaveBeenCalled();
    const callsBeforeUnsubscribe = listener.mock.calls.length;
    unsubscribe();
    await client.disconnect();
    expect(listener.mock.calls.length).toBe(callsBeforeUnsubscribe);
  });

  it("returns unavailable before connecting and maps send failures", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();

    const unavailable = await client.request("hover", {});
    expect(unavailable.isErr()).toBe(true);
    if (unavailable.isErr()) {
      expect(unavailable.error.code).toBe("unavailable");
    }

    await client.connect(makeState());
    const failed = await client.request("fail", {});
    expect(failed.isErr()).toBe(true);
    if (failed.isErr()) {
      expect(failed.error.code).toBe("connection");
    }
  });

  it("resolves out-of-order responses by request id and times out unanswered requests", async () => {
    vi.useFakeTimers();
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const connectPromise = client.connect(makeState());
    await vi.advanceTimersByTimeAsync(0);
    await connectPromise;

    const firstPromise = client.request("first", {});
    const secondPromise = client.request("second", {});
    await vi.advanceTimersByTimeAsync(0);
    const second = await secondPromise;
    expect(second.isOk()).toBe(true);
    if (second.isOk()) {
      expect(second.value).toBe("second");
    }
    await vi.advanceTimersByTimeAsync(20);
    const first = await firstPromise;
    expect(first.isOk()).toBe(true);

    const timeoutPromise = client.request("slow", {});
    await vi.advanceTimersByTimeAsync(10_000);
    const timeout = await timeoutPromise;
    expect(timeout.isErr()).toBe(true);
    if (timeout.isErr()) {
      expect(timeout.error.code).toBe("timeout");
    }
  });

  it("rejects pending requests and stops cleanly on disconnect", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    await client.connect(makeState());

    const pending = client.request("slow", {});
    const disconnect = await client.disconnect();
    const rejected = await pending;

    expect(disconnect.isOk()).toBe(true);
    expect(client.getStatus()).toBe("disconnected");
    expect(rejected.isErr()).toBe(true);
    if (rejected.isErr()) {
      expect(rejected.error.code).toBe("connection");
    }
    const notifyAfterDisconnect = await client.notify("initialized", {});
    expect(notifyAfterDisconnect.isOk()).toBe(true);
  });

  it("reports an invalid workspace URI and ignores malformed payloads", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const result = await client.connect(makeState("invalid-uri"));

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("protocol");
    }
    expect(client.getStatus()).toBe("unavailable");

    const healthy = new ScriptLspClient();
    await healthy.connect(makeState());
    const malformed = await healthy.notify("bad", {});
    expect(malformed.isOk()).toBe(true);
  });

  it("maps virtual and server workspace URIs", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    await client.connect(makeState());

    expect(client.clientUri("https://luals.test/workspace/main.lua").toString()).toBe(
      "file:///workspace/cromagrally/main.lua",
    );
    expect(client.clientUri("https://other.test/main.lua").toString()).toBe(
      "https://other.test/main.lua",
    );
    const serverUri = "https://luals.test/workspace/item%20%231%2050%25.lua";
    const clientUri = client.clientUri(serverUri);
    expect(clientUri.toString()).toBe("file:///workspace/cromagrally/item%20%231%2050%25.lua");
    expect(client.sourcePath(serverUri)).toBe("item #1 50%.lua");
    expect(client.sourcePath(clientUri.toString())).toBe("item #1 50%.lua");
    expect(client.documentUri({ uri: clientUri })).toBe(serverUri);
  });

  it("publishes typed LuaLS diagnostics for the workspace state", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const events: unknown[] = [];
    client.subscribeDiagnostics((event) => events.push(event));
    await client.connect(makeState());

    const result = await client.notify("publish", {});

    expect(result.isOk()).toBe(true);
    expect(events).toEqual([{
      filePath: "main.lua",
      diagnostics: [{
        category: "luals",
        severity: "error",
        message: "bad value",
        code: "luals",
        filePath: "main.lua",
        line: 3,
        column: 5,
      }],
    }]);
  });

  it("keeps a session and declarations stable while synchronizing only changed or deleted files", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const state = makeState();
    await client.connect(state);
    expect(client.getCapabilities()).toEqual({ formatting: true, rename: true, signatureHelp: false, completionResolve: false });
    transportCalls.length = 0;
    await client.connect(state);
    expect(transportCalls).toEqual([]);
    const source = state.sourceFiles["main.lua"];
    if (!source) return;
    await client.connect({ ...state, sourceFiles: { "main.lua": { ...source, content: "return 1" } } });
    expect(transportCalls).toEqual([{ method: "SyncFile", args: ["main.lua", "return 1"] }]);
    transportCalls.length = 0;
    await client.connect({ ...state, sourceFiles: {} });
    expect(transportCalls).toEqual([{ method: "DeleteFile", args: ["main.lua"] }]);
  });

  it("opens retained models once and sends incremental edits without resyncing the project", async () => {
    const { ScriptLspClient } = await import("./scriptLspClient");
    const client = new ScriptLspClient();
    const state = makeState();
    await client.connect(state);
    transportCalls.length = 0;
    let text = "return {}";
    const model = { uri: { toString: () => "file:///workspace/cromagrally/main.lua" }, getLanguageId: () => "lua", getVersionId: () => 2, getValue: () => text };
    client.openDocument(model);
    client.openDocument(model);
    expect(transportCalls).toHaveLength(1);
    expect(transportCalls[0]?.args[0]).toContain('"method":"textDocument/didOpen"');
    text = "return 1";
    client.changeDocument(model, { changes: [{ range: { startLineNumber: 1, startColumn: 8, endLineNumber: 1, endColumn: 10 }, rangeOffset: 7, rangeLength: 2, text: "1" }] });
    const source = state.sourceFiles["main.lua"];
    if (!source) return;
    await client.connect({ ...state, sourceFiles: { "main.lua": { ...source, content: text } } });
    expect(transportCalls).toHaveLength(2);
    expect(transportCalls[1]?.args[0]).toContain('"method":"textDocument/didChange"');
    const foreignModel = { ...model, uri: { toString: () => "file:///workspace/another-game/main.lua" } };
    client.openDocument(foreignModel);
    expect(transportCalls).toHaveLength(2);
    client.closeDocument(model);
    client.closeDocument(model);
    expect(transportCalls).toHaveLength(3);
  });
});
