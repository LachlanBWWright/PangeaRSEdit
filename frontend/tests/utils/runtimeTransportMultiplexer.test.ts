import { describe, expect, it } from "vitest";
import { ok } from "neverthrow";
import {
  createClientRuntimeTransportGuard,
  createHostRuntimeTransportMultiplexer,
} from "@/multiplayer/runtimeTransportMultiplexer";

function encodePnetV2Header(input: {
  readonly packetType: number;
  readonly matchIdLow: number;
  readonly matchIdHigh: number;
  readonly playerIndex: number;
}): ArrayBuffer {
  const bytes = new ArrayBuffer(28);
  const view = new DataView(bytes);
  view.setUint32(0, 0x54454e50, true);
  view.setUint16(4, 2, true);
  view.setUint16(6, input.packetType, true);
  view.setUint32(8, input.matchIdLow, true);
  view.setUint32(12, input.matchIdHigh, true);
  view.setUint32(16, 10, true);
  view.setUint32(20, 1, true);
  view.setUint16(24, input.playerIndex, true);
  view.setUint16(26, 0, true);
  return bytes;
}

function createFakePeerHandle() {
  const listeners: ((bytes: ArrayBuffer) => void)[] = [];
  return {
    handle: {
      transport: {
        sendReliable: () => ok(undefined),
        sendUnreliable: () => ok(undefined),
        reportDesync: () => undefined,
        reportMatchEnded: () => undefined,
        subscribeIncoming: (onPacket: (bytes: ArrayBuffer) => void) => {
          listeners.push(onPacket);
          return () => {
            const index = listeners.indexOf(onPacket);
            if (index >= 0) {
              listeners.splice(index, 1);
            }
          };
        },
      },
      dispose: () => undefined,
    },
    emit: (bytes: ArrayBuffer) => {
      for (const listener of listeners) {
        listener(bytes);
      }
    },
  };
}

function createFakeManagedTransport() {
  const listeners: ((bytes: ArrayBuffer) => void)[] = [];
  return {
    transport: {
      sendReliable: () => ok(undefined),
      sendUnreliable: () => ok(undefined),
      reportDesync: () => undefined,
      reportMatchEnded: () => undefined,
      subscribeIncoming: (onPacket: (bytes: ArrayBuffer) => void) => {
        listeners.push(onPacket);
        return () => {
          const index = listeners.indexOf(onPacket);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        };
      },
    },
    emit: (bytes: ArrayBuffer) => {
      for (const listener of listeners) {
        listener(bytes);
      }
    },
  };
}

describe("runtime transport multiplexer", () => {
  it("forwards valid raw PNET client packets from mapped peer", () => {
    const peer = createFakePeerHandle();
    const mux = createHostRuntimeTransportMultiplexer({
      getExpectedPlayerIndexForParticipant: (participantId) =>
        participantId === "p1" ? 1 : null,
      getExpectedMatchIdentity: () => ({
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
      }),
      reportDesync: () => undefined,
      reportMatchEnded: () => undefined,
    });
    mux.attachPeer("p1", peer.handle);

    const received: ArrayBuffer[] = [];
    const unsubscribe = mux.transport.subscribeIncoming((bytes) => {
      received.push(bytes);
    });

    peer.emit(
      encodePnetV2Header({
        packetType: 2,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 1,
      }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
    mux.dispose();
  });

  it("drops raw PNET client packets when claimed player index mismatches peer mapping", () => {
    const peer = createFakePeerHandle();
    const mux = createHostRuntimeTransportMultiplexer({
      getExpectedPlayerIndexForParticipant: (participantId) =>
        participantId === "p1" ? 1 : null,
      getExpectedMatchIdentity: () => ({
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
      }),
      reportDesync: () => undefined,
      reportMatchEnded: () => undefined,
    });
    mux.attachPeer("p1", peer.handle);

    const received: ArrayBuffer[] = [];
    const unsubscribe = mux.transport.subscribeIncoming((bytes) => {
      received.push(bytes);
    });

    peer.emit(
      encodePnetV2Header({
        packetType: 2,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 2,
      }),
    );

    expect(received.length).toBe(0);
    unsubscribe();
    mux.dispose();
  });

  it("drops raw PNET packets when match identity mismatches", () => {
    const peer = createFakePeerHandle();
    const mux = createHostRuntimeTransportMultiplexer({
      getExpectedPlayerIndexForParticipant: (participantId) =>
        participantId === "p1" ? 1 : null,
      getExpectedMatchIdentity: () => ({
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
      }),
      reportDesync: () => undefined,
      reportMatchEnded: () => undefined,
    });
    mux.attachPeer("p1", peer.handle);

    const received: ArrayBuffer[] = [];
    const unsubscribe = mux.transport.subscribeIncoming((bytes) => {
      received.push(bytes);
    });

    peer.emit(
      encodePnetV2Header({
        packetType: 2,
        matchIdLow: 0x11111111,
        matchIdHigh: 0x22222222,
        playerIndex: 1,
      }),
    );

    expect(received.length).toBe(0);
    unsubscribe();
    mux.dispose();
  });

  it("client guard only forwards host-owned raw PNET packets", () => {
    const base = createFakeManagedTransport();
    const guarded = createClientRuntimeTransportGuard({
      transport: base.transport,
      expectedHostPlayerIndex: 0,
      expectedMatchIdentity: () => ({
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
      }),
    });

    const received: ArrayBuffer[] = [];
    const unsubscribe = guarded.subscribeIncoming((bytes) => {
      received.push(bytes);
    });

    base.emit(
      encodePnetV2Header({
        packetType: 3,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 1,
      }),
    );
    base.emit(
      encodePnetV2Header({
        packetType: 1,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 0,
      }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
  });

  it("replaces existing peer subscription when participant reconnects", () => {
    const first = createFakePeerHandle();
    const second = createFakePeerHandle();
    const mux = createHostRuntimeTransportMultiplexer({
      getExpectedPlayerIndexForParticipant: (participantId) =>
        participantId === "p1" ? 1 : null,
      getExpectedMatchIdentity: () => ({
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
      }),
      reportDesync: () => undefined,
      reportMatchEnded: () => undefined,
    });
    mux.attachPeer("p1", first.handle);
    mux.attachPeer("p1", second.handle);

    const received: ArrayBuffer[] = [];
    const unsubscribe = mux.transport.subscribeIncoming((bytes) => {
      received.push(bytes);
    });

    first.emit(
      encodePnetV2Header({
        packetType: 2,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 1,
      }),
    );
    second.emit(
      encodePnetV2Header({
        packetType: 2,
        matchIdLow: 0x10203040,
        matchIdHigh: 0x50607080,
        playerIndex: 1,
      }),
    );

    expect(received.length).toBe(1);
    unsubscribe();
    mux.dispose();
  });
});
