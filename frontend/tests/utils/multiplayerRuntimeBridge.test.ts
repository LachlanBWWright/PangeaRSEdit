import { afterEach, describe, expect, it, vi } from "vitest";
import { err, ok } from "neverthrow";
import {
  createManagedMultiplayerRuntimeBridge,
  createMultiplayerRuntimeBridge,
  getMultiplayerRuntimeDebugStats,
  installMultiplayerRuntimeBridge,
  setMultiplayerNetworkDebugOptions,
} from "@/multiplayer/runtimeBridge";

function encodePnetV2Header(input: {
  readonly packetType: number;
  readonly matchIdLow: number;
  readonly matchIdHigh: number;
  readonly playerIndex: number;
  readonly version?: number;
}): ArrayBuffer {
  const bytes = new ArrayBuffer(28);
  const view = new DataView(bytes);
  view.setUint32(0, 0x54454e50, true);
  view.setUint16(4, input.version ?? 2, true);
  view.setUint16(6, input.packetType, true);
  view.setUint32(8, input.matchIdLow, true);
  view.setUint32(12, input.matchIdHigh, true);
  view.setUint32(16, 12, true);
  view.setUint32(20, 1, true);
  view.setUint16(24, input.playerIndex, true);
  view.setUint16(26, 0, true);
  return bytes;
}

describe("multiplayer runtime bridge", () => {
  afterEach(() => {
    setMultiplayerNetworkDebugOptions({
      latencyMs: 0,
      packetLossPercent: 0,
      packetBurstPercent: 0,
      packetBurstSize: 1,
    });
  });

  it("queues and polls incoming packets in order", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 1234,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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

  it("falls back to reliable send when unreliable send fails", () => {
    const sendReliable = vi.fn(() => ok(undefined));
    const sendUnreliable = vi.fn(() => err("State data channel is congested"));
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 42,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
      },
      {
        sendReliable,
        sendUnreliable,
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const payload = Uint8Array.from([1, 2, 3]).buffer;
    expect(bridge.sendUnreliable(payload)).toBe(true);
    expect(sendUnreliable).toHaveBeenCalledTimes(1);
    expect(sendReliable).toHaveBeenCalledTimes(1);
  });

  it("can drop outgoing packets with debug impairment enabled", () => {
    const sendReliable = vi.fn(() => ok(undefined));
    setMultiplayerNetworkDebugOptions({
      latencyMs: 0,
      packetLossPercent: 100,
      packetBurstPercent: 0,
      packetBurstSize: 1,
    });
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 42,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
      },
      {
        sendReliable,
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    expect(bridge.sendReliable(Uint8Array.from([1, 2, 3]).buffer)).toBe(true);
    expect(sendReliable).not.toHaveBeenCalled();
    expect(getMultiplayerRuntimeDebugStats().impairedDropped).toBeGreaterThan(0);
    setMultiplayerNetworkDebugOptions({
      latencyMs: 0,
      packetLossPercent: 0,
      packetBurstPercent: 0,
      packetBurstSize: 1,
    });
  });

  it("can drop incoming packets with debug impairment enabled", () => {
    setMultiplayerNetworkDebugOptions({
      latencyMs: 0,
      packetLossPercent: 100,
      packetBurstPercent: 0,
      packetBurstSize: 1,
    });
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 42,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    expect(bridge.enqueueIncoming(Uint8Array.from([4, 5, 6]).buffer).isOk()).toBe(
      true,
    );
    expect(bridge.pollMessage(16)).toBeNull();
    setMultiplayerNetworkDebugOptions({
      latencyMs: 0,
      packetLossPercent: 0,
      packetBurstPercent: 0,
      packetBurstSize: 1,
    });
  });

  it("subscribes incoming packets through managed transport", () => {
    const listeners: ((bytes: ArrayBuffer) => void)[] = [];
    const { bridge, dispose } = createManagedMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 55,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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
        hostPlayerIndex: 0,
        matchIdLow: 111,
        matchIdHigh: 222,
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
    expect(bridge.getMatchIdLow()).toBe(111);
    expect(bridge.getMatchIdHigh()).toBe(222);
  });

  it("clones incoming packets", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 12,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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

  it("rejects raw PNET packets with mismatched match identity", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 10,
        hostPlayerIndex: 0,
        matchIdLow: 0x01020304,
        matchIdHigh: 0x11223344,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const packet = encodePnetV2Header({
      packetType: 3,
      matchIdLow: 0xaaaaaaaa,
      matchIdHigh: 0xbbbbbbbb,
      playerIndex: 0,
    });

    expect(bridge.enqueueIncoming(packet).isErr()).toBe(true);
  });

  it("rejects raw host packets from non-host player index on clients", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 10,
        hostPlayerIndex: 0,
        matchIdLow: 0x01020304,
        matchIdHigh: 0x11223344,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const packet = encodePnetV2Header({
      packetType: 3,
      matchIdLow: 0x01020304,
      matchIdHigh: 0x11223344,
      playerIndex: 1,
    });

    expect(bridge.enqueueIncoming(packet).isErr()).toBe(true);
  });

  it("rejects raw PNET packets with unsupported version", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: false,
        localPlayerIndex: 1,
        playerCount: 2,
        matchSeed: 10,
        hostPlayerIndex: 0,
        matchIdLow: 0x01020304,
        matchIdHigh: 0x11223344,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    const packet = encodePnetV2Header({
      packetType: 3,
      matchIdLow: 0x01020304,
      matchIdHigh: 0x11223344,
      playerIndex: 0,
      version: 99,
    });

    expect(bridge.enqueueIncoming(packet).isErr()).toBe(true);
  });

  it("drops newest snapshot when queue is full of non-snapshots", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 10,
        hostPlayerIndex: 0,
        matchIdLow: 0x01020304,
        matchIdHigh: 0x11223344,
      },
      {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
      },
    );

    for (let index = 0; index < 256; index += 1) {
      expect(
        bridge.enqueueIncoming(Uint8Array.from([index % 255]).buffer).isOk(),
      ).toBe(true);
    }

    const snapshotPacket = encodePnetV2Header({
      packetType: 3,
      matchIdLow: 0x01020304,
      matchIdHigh: 0x11223344,
      playerIndex: 0,
    });
    expect(bridge.enqueueIncoming(snapshotPacket).isOk()).toBe(true);
  });

  it("installs and uninstalls PangeaNet", () => {
    const bridge = createMultiplayerRuntimeBridge(
      {
        isHost: true,
        localPlayerIndex: 0,
        playerCount: 2,
        matchSeed: 10,
        hostPlayerIndex: 0,
        matchIdLow: 11,
        matchIdHigh: 22,
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
