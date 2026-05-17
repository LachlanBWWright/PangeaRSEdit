import { describe, expect, it, vi } from "vitest";
import { createWebRtcRuntimeTransport } from "@/multiplayer/webrtcRuntimeTransport";

class FakeDataChannel {
  public readyState = "open";
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  private readonly messageListeners = new Set<(event: { data: unknown }) => void>();
  public sent: ArrayBuffer[] = [];

  send(data: ArrayBuffer): void {
    this.sent.push(data);
  }

  addEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void {
    if (type === "message") {
      this.messageListeners.add(listener);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: { data: unknown }) => void,
  ): void {
    if (type === "message") {
      this.messageListeners.delete(listener);
    }
  }

  emit(data: unknown): void {
    for (const listener of this.messageListeners) {
      listener({ data });
    }
  }

  emitOpen(): void {
    this.onopen?.();
  }

  emitClose(): void {
    this.readyState = "closed";
    this.onclose?.();
  }

  listenerCount(): number {
    return this.messageListeners.size;
  }
}

describe("webrtc runtime transport", () => {
  it("sends reliable and unreliable packets", () => {
    const reliable = new FakeDataChannel();
    const unreliable = new FakeDataChannel();
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
      unreliableChannel: unreliable,
    });

    const a = Uint8Array.from([1]).buffer;
    const b = Uint8Array.from([2]).buffer;

    expect(transport.sendReliable(a).isOk()).toBe(true);
    expect(transport.sendUnreliable(b).isOk()).toBe(true);
    expect(reliable.sent.length).toBe(1);
    expect(unreliable.sent.length).toBe(1);
  });

  it("notifies subscribers with incoming packet bytes", () => {
    const reliable = new FakeDataChannel();
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
    });

    const onPacket = vi.fn();
    const unsubscribe = transport.subscribeIncoming(onPacket);

    reliable.emit(Uint8Array.from([9, 8]).buffer);
    expect(onPacket).toHaveBeenCalledTimes(1);

    unsubscribe();
    reliable.emit(Uint8Array.from([7]).buffer);
    expect(onPacket).toHaveBeenCalledTimes(1);
  });

  it("relays packets from another transport", () => {
    const senderChannel = new FakeDataChannel();
    const receiverChannel = new FakeDataChannel();
    const { transport: sender } = createWebRtcRuntimeTransport({
      reliableChannel: senderChannel,
    });
    const { transport: receiver } = createWebRtcRuntimeTransport({
      reliableChannel: receiverChannel,
    });

    const onPacket = vi.fn();
    receiver.subscribeIncoming(onPacket);

    const payload = Uint8Array.from([9, 8, 7]).buffer;
    expect(sender.sendReliable(payload).isOk()).toBe(true);
    const packet = senderChannel.sent[0];
    expect(packet).toBeDefined();
    if (!packet) {
      return;
    }
    receiverChannel.emit(packet);

    expect(onPacket).toHaveBeenCalledTimes(1);
    const firstCall = onPacket.mock.calls[0];
    const receivedBytes = firstCall?.[0];
    expect(receivedBytes).toBeInstanceOf(ArrayBuffer);
    if (!(receivedBytes instanceof ArrayBuffer)) {
      return;
    }
    expect(Array.from(new Uint8Array(receivedBytes))).toEqual([9, 8, 7]);
  });

  it("reports heartbeat timeout disruptions", async () => {
    vi.useFakeTimers();
    let now = 0;
    const reliable = new FakeDataChannel();
    const events: string[] = [];
    const { dispose } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
      heartbeatIntervalMs: 100,
      heartbeatTimeoutMs: 250,
      nowMilliseconds: () => now,
      onDisruptionEvent: (event) => {
        events.push(event.type);
      },
    });

    now += 400;
    await vi.advanceTimersByTimeAsync(400);
    expect(events).toContain("heartbeat-timeout");
    expect(events).toContain("sync-paused");
    dispose();
    vi.useRealTimers();
  });

  it("reports peer disconnect on channel close", () => {
    const reliable = new FakeDataChannel();
    const events: string[] = [];
    createWebRtcRuntimeTransport({
      reliableChannel: reliable,
      onDisruptionEvent: (event) => {
        events.push(event.type);
      },
    });

    reliable.emitClose();
    expect(events).toContain("peer-disconnected");
    expect(events).toContain("sync-paused");
  });

  it("forwards report callbacks", () => {
    const reliable = new FakeDataChannel();
    const reportDesync = vi.fn();
    const reportMatchEnded = vi.fn();

    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
      reportDesync,
      reportMatchEnded,
    });

    transport.reportDesync(1, 2, 3);
    transport.reportMatchEnded(4);

    expect(reportDesync).toHaveBeenCalledWith(1, 2, 3);
    expect(reportMatchEnded).toHaveBeenCalledWith(4);
  });

  it("falls back to reliable channel for unreliable sends", () => {
    const reliable = new FakeDataChannel();
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
    });

    const payload = Uint8Array.from([42]).buffer;
    expect(transport.sendUnreliable(payload).isOk()).toBe(true);
    expect(reliable.sent.length).toBe(1);
  });

  it("rejects sends on closed channels", () => {
    const reliable = new FakeDataChannel();
    reliable.readyState = "closed";
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
    });

    expect(transport.sendReliable(Uint8Array.from([1]).buffer).isErr()).toBe(true);
    expect(transport.sendUnreliable(Uint8Array.from([2]).buffer).isErr()).toBe(true);
  });

  it("handles ArrayBuffer and Uint8Array incoming payloads", () => {
    const reliable = new FakeDataChannel();
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
    });

    const received: number[][] = [];
    transport.subscribeIncoming((bytes) => {
      received.push(Array.from(new Uint8Array(bytes)));
    });

    reliable.emit(Uint8Array.from([1, 2]).buffer);
    reliable.emit(Uint8Array.from([3, 4]));

    expect(received).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it("ignores unsupported incoming payloads", () => {
    const reliable = new FakeDataChannel();
    const { transport } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
    });

    const onPacket = vi.fn();
    transport.subscribeIncoming(onPacket);
    reliable.emit("unsupported");
    expect(onPacket).not.toHaveBeenCalled();
  });

  it("removes listeners on dispose", () => {
    const reliable = new FakeDataChannel();
    const unreliable = new FakeDataChannel();
    const { dispose } = createWebRtcRuntimeTransport({
      reliableChannel: reliable,
      unreliableChannel: unreliable,
    });

    expect(reliable.listenerCount()).toBe(1);
    expect(unreliable.listenerCount()).toBe(1);
    dispose();
    expect(reliable.listenerCount()).toBe(0);
    expect(unreliable.listenerCount()).toBe(0);
  });
});
