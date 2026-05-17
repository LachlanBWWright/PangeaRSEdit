import { describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import {
  createManagedMultiplayerRuntimeBridge,
  createMultiplayerRuntimeBridge,
  installMultiplayerRuntimeBridge,
} from "@/multiplayer/runtimeBridge";

describe("multiplayer runtime bridge", () => {
  it("queues and polls incoming packets in order", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 1234,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const first = Uint8Array.from([1, 2]).buffer;
    const second = Uint8Array.from([3]).buffer;

    expect(bridge.enqueueIncoming(first).isOk()).toBe(true);
    expect(bridge.enqueueIncoming(second).isOk()).toBe(true);

    const out1 = bridge.pollMessage(16);
    const out2 = bridge.pollMessage(16);

    expect(out1).not.toBeNull();
    expect(out2).not.toBeNull();
    if (!out1 || !out2) {
      return;
    }

    expect(Array.from(new Uint8Array(out1))).toEqual([1, 2]);
    expect(Array.from(new Uint8Array(out2))).toEqual([3]);
  });

  it("keeps packets queued when max byte count is too small", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 999,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const packet = Uint8Array.from([7, 8, 9]).buffer;
    expect(bridge.enqueueIncoming(packet).isOk()).toBe(true);

    expect(bridge.pollMessage(2)).toBeNull();
    const replay = bridge.pollMessage(3);
    expect(replay).not.toBeNull();
    if (!replay) {
      return;
    }
    expect(Array.from(new Uint8Array(replay))).toEqual([7, 8, 9]);
  });

  it("reports transport callbacks", () => {
    const reportDesync = vi.fn();
    const reportMatchEnded = vi.fn();

    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 42,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync,
        reportMatchEnded,
      },
    );

    bridge.reportDesync(100, 111, 222);
    bridge.reportMatchEnded(3);

    expect(reportDesync).toHaveBeenCalledWith(100, 111, 222);
    expect(reportMatchEnded).toHaveBeenCalledWith(3);
  });

  it("subscribes incoming packets through managed transport", () => {
    const listeners: ((bytes: ArrayBuffer) => void)[] = [];
    const { bridge, dispose } = createManagedMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 55,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
        subscribeIncoming: (onPacket) => {
          listeners.push(onPacket);
          return () => {
            const idx = listeners.indexOf(onPacket);
            if (idx >= 0) {
              listeners.splice(idx, 1);
            }
          };
        },
      },
    );

    expect(listeners.length).toBe(1);
    const notify = listeners[0];
    if (!notify) {
      return;
    }

    notify(Uint8Array.from([4, 5]).buffer);
    const packet = bridge.pollMessage(16);
    expect(packet).not.toBeNull();
    if (!packet) {
      return;
    }
    expect(Array.from(new Uint8Array(packet))).toEqual([4, 5]);

    dispose();
    expect(listeners.length).toBe(0);
  });

  it("exposes static runtime config values", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 31415,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    expect(bridge.isEnabled()).toBe(true);
    expect(bridge.isHost()).toBe(true);
    expect(bridge.getLocalPlayerIndex()).toBe(0);
    expect(bridge.getPlayerCount()).toBe(2);
    expect(bridge.getMatchSeed()).toBe(31415);
  });

  it("clones incoming packets", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 12,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const source = Uint8Array.from([1, 2, 3]);
    expect(bridge.enqueueIncoming(source.buffer).isOk()).toBe(true);
    source[0] = 99;
    const packet = bridge.pollMessage(8);
    expect(packet).not.toBeNull();
    if (!packet) {
      return;
    }
    expect(Array.from(new Uint8Array(packet))).toEqual([1, 2, 3]);
  });

  it("installs and uninstalls PangeaNet", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 10,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const runtimeWindow: Record<string, unknown> = {};
    const dispose = installMultiplayerRuntimeBridge(runtimeWindow, bridge);
    expect("PangeaNet" in runtimeWindow).toBe(true);
    dispose();
    expect("PangeaNet" in runtimeWindow).toBe(false);
  });
});
