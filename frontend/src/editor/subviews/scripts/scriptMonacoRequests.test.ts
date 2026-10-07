import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok, type Result } from "neverthrow";
import type { LspClientError } from "./scriptLspClient";
import { requestCurrentScriptFeature } from "./scriptMonacoRequests";

const transport = vi.hoisted(() => ({ connectedGame: "Otto", request: vi.fn<(method: string, params: unknown, timeout?: number) => Promise<Result<unknown, LspClientError>>>() }));
vi.mock("./scriptLspClient", () => ({ scriptLspClient: { isWorkspaceConnected: (game: string) => game === transport.connectedGame, request: transport.request } }));

function requestFixture() {
  let version = 1;
  let disposed = false;
  const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => undefined }) };
  const model = { getVersionId: () => version, isDisposed: () => disposed };
  let complete: (result: Result<unknown, LspClientError>) => void = () => undefined;
  transport.request.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
  return { model, token, edit: () => { version++; }, dispose: () => { disposed = true; }, complete: () => complete(ok({ label: "completion" })) };
}

describe("IntelliSense response freshness", () => {
  beforeEach(() => { transport.connectedGame = "Otto"; transport.request.mockReset(); });

  it("never sends cancelled requests or requests for a different game", async () => {
    const fixture = requestFixture();
    expect(await requestCurrentScriptFeature(fixture.model, fixture.token, "Bugdom", "completion", {})).toBeNull();
    fixture.token.isCancellationRequested = true;
    expect(await requestCurrentScriptFeature(fixture.model, fixture.token, "Otto", "completion", {})).toBeNull();
    expect(transport.request).not.toHaveBeenCalled();
  });

  it.each(["edit", "dispose", "cancel", "switch-game"])("discards a response after %s", async (change) => {
    const fixture = requestFixture();
    const result = requestCurrentScriptFeature(fixture.model, fixture.token, "Otto", "completion", {});
    if (change === "edit") fixture.edit();
    if (change === "dispose") fixture.dispose();
    if (change === "cancel") fixture.token.isCancellationRequested = true;
    if (change === "switch-game") transport.connectedGame = "Bugdom";
    fixture.complete();
    expect(await result).toBeNull();
  });

  it("keeps current responses and uses a short timeout for interactive features", async () => {
    const fixture = requestFixture();
    const result = requestCurrentScriptFeature(fixture.model, fixture.token, "Otto", "completion", {});
    fixture.complete();
    expect((await result)?.isOk()).toBe(true);
    expect(transport.request).toHaveBeenCalledWith("completion", {}, 1500);
  });
});
