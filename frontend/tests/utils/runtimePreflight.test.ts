import { afterEach, describe, expect, it, vi } from "vitest";
import { runRuntimePreflight } from "@/multiplayer/runtimePreflight/runRuntimePreflight";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";
import { Game } from "@/data/globals/globals";

describe("runtime preflight", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("passes when required exports and assets are present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: unknown) => {
        const textUrl = String(url);
        if (textUrl.endsWith(".js")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                `PangeaGame_SetNetworkMatchConfig PangeaGame_StartNetworkMatch PangeaGame_DebugGetLocalPlayerIndex PangeaGame_DebugGetPlayerCount PangeaGame_DebugIsNetworkMatchRunning "Test.wasm" "Test.data"`,
              ),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(""),
        });
      }),
    );

    const result = await runRuntimePreflight({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      gameId: "cromagrally",
      trackOrLevel: "1",
    });

    expect(result.isOk()).toBe(true);
  });

  it("fails when required exports are missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("no multiplayer exports"),
      }),
    );

    const result = await runRuntimePreflight({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      gameId: "cromagrally",
      trackOrLevel: "1",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("preflight.export-missing");
    }
  });

  it("fails when a dependency fetch stalls and times out", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: unknown, init?: RequestInit) => {
        const textUrl = String(url);
        if (textUrl.endsWith(".js")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                `PangeaGame_SetNetworkMatchConfig PangeaGame_StartNetworkMatch PangeaGame_DebugGetLocalPlayerIndex PangeaGame_DebugGetPlayerCount PangeaGame_DebugIsNetworkMatchRunning \"Test.wasm\"`,
              ),
          });
        }

        return new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        });
      }),
    );

    const resultPromise = runRuntimePreflight({
      config: GAME_PORT_CONFIGS[Game.CRO_MAG],
      gameId: "cromagrally",
      trackOrLevel: "1",
    });

    await vi.advanceTimersByTimeAsync(60_001);
    const result = await resultPromise;

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("preflight.asset-missing");
    }
  });
});
