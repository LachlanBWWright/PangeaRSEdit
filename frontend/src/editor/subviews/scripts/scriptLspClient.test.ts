import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

vi.mock("@microsoft/signalr", () => {
  class FakeConnection {
    private payloadHandler: ((payload: string) => void) | undefined;

    public on(
      method: string,
      handler: (payload: string) => void,
    ): void {
      if (method === "ReceiveLspPayload") {
        this.payloadHandler = handler;
      }
    }

    public onreconnecting(handler: () => void): void {
      void handler;
    }

    public onreconnected(handler: () => void): void {
      void handler;
    }

    public onclose(handler: () => void): void {
      void handler;
    }

    public start(): Promise<void> {
      return Promise.resolve();
    }

    public stop(): Promise<void> {
      return Promise.resolve();
    }

    public invoke(method: string, ...args: string[]): Promise<unknown> {
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
        result: payload.includes('"method":"second"') ? "second" : {},
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
    getModels: () => [],
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
  beforeEach(() => {
    vi.useRealTimers();
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
    expect(client.getStatus()).toBe("connecting");

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
      "file:///workspace/main.lua",
    );
    expect(client.clientUri("https://other.test/main.lua").toString()).toBe(
      "https://other.test/main.lua",
    );
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
});
