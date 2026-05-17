import { describe, expect, it, vi } from "vitest";
import { okAsync } from "neverthrow";
import {
  createHostSession,
  type HostPeerConnection,
  type HostSessionDataChannel,
  type WebRtcSessionState,
} from "@/multiplayer/webrtc/hostSession";
import { createClientSession } from "@/multiplayer/webrtc/clientSession";

class FakeDataChannel implements HostSessionDataChannel {
  public readonly label: string;
  public readonly readyState = "open";
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  private readonly listeners = new Set<(
    event: { readonly data: unknown },
  ) => void>();

  constructor(label = "pangea-control") {
    this.label = label;
  }

  emitOpen(): void {
    this.onopen?.();
  }

  emitClose(): void {
    this.onclose?.();
  }

  send(_data: ArrayBuffer): void {
    void _data;
  }

  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void {
    if (type === "message") {
      this.listeners.add(listener);
    }
  }

  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void {
    if (type === "message") {
      this.listeners.delete(listener);
    }
  }
}

class FakePeerConnection implements HostPeerConnection {
  public connectionState = "new";
  public onicecandidate:
    | ((event: { readonly candidate: RTCIceCandidateInit | null }) => void)
    | null = null;
  public onconnectionstatechange: (() => void) | null = null;
  public ondatachannel:
    | ((event: { readonly channel: HostSessionDataChannel }) => void)
    | null = null;

  public readonly dataChannel = new FakeDataChannel();
  public readonly stateDataChannel = new FakeDataChannel("pangea-state");

  createDataChannel(
    label: string,
    _options: { readonly ordered: boolean; readonly maxRetransmits?: number },
  ): HostSessionDataChannel {
    if (label === "pangea-state") {
      return this.stateDataChannel;
    }
    void _options;
    return this.dataChannel;
  }

  createOffer(): Promise<RTCSessionDescriptionInit> {
    return Promise.resolve({
      type: "offer",
      sdp: "offer-sdp",
    });
  }

  createAnswer(): Promise<RTCSessionDescriptionInit> {
    return Promise.resolve({
      type: "answer",
      sdp: "answer-sdp",
    });
  }

  setLocalDescription(_description: RTCSessionDescriptionInit): Promise<void> {
    void _description;
    return Promise.resolve();
  }

  setRemoteDescription(_description: RTCSessionDescriptionInit): Promise<void> {
    void _description;
    return Promise.resolve();
  }

  addIceCandidate(_candidate: RTCIceCandidateInit): Promise<void> {
    void _candidate;
    return Promise.resolve();
  }

  close(): void {
    this.connectionState = "closed";
    this.onconnectionstatechange?.();
  }

  emitDataChannel(channel: HostSessionDataChannel): void {
    this.ondatachannel?.({ channel });
  }
}

describe("webrtc host/client sessions", () => {
  it("host session transitions through connection states", async () => {
    const states: WebRtcSessionState[] = [];
    const fakeConnection = new FakePeerConnection();
    const hostSession = createHostSession({
      createPeerConnection: () => okAsync(fakeConnection),
      sendOffer: () => okAsync(undefined),
      sendIceCandidate: () => okAsync(undefined),
      onStateChanged: (_, state) => {
        states.push(state);
      },
    });

    const startResult = await hostSession.startPeer("guest-1");
    expect(startResult.isOk()).toBe(true);

    fakeConnection.dataChannel.emitOpen();
    fakeConnection.stateDataChannel.emitOpen();
    fakeConnection.connectionState = "failed";
    fakeConnection.onconnectionstatechange?.();
    hostSession.closePeer("guest-1");

    expect(states).toEqual([
      "connecting",
      "connected",
      "failed",
      "closed",
      "closed",
    ]);
  });

  it("client session transitions through connection states", async () => {
    const states: WebRtcSessionState[] = [];
    const fakeConnection = new FakePeerConnection();
    const onDataChannelOpened = vi.fn();

    const session = createClientSession({
      createPeerConnection: () => okAsync(fakeConnection),
      sendAnswer: () => okAsync(undefined),
      sendIceCandidate: () => okAsync(undefined),
      onStateChanged: (state) => {
        states.push(state);
      },
      onDataChannelOpened,
    });

    const offerResult = await session.receiveOffer("host-1", "offer-sdp");
    expect(offerResult.isOk()).toBe(true);

    const incomingControlChannel = new FakeDataChannel("pangea-control");
    const incomingStateChannel = new FakeDataChannel("pangea-state");
    fakeConnection.emitDataChannel(incomingControlChannel);
    fakeConnection.emitDataChannel(incomingStateChannel);
    incomingControlChannel.emitOpen();
    incomingStateChannel.emitOpen();
    fakeConnection.connectionState = "failed";
    fakeConnection.onconnectionstatechange?.();
    session.close();

    expect(onDataChannelOpened).toHaveBeenCalledTimes(1);
    expect(states).toEqual([
      "connecting",
      "connected",
      "failed",
      "closed",
      "closed",
    ]);
  });

  it("host session times out when data channel never opens", async () => {
    vi.useFakeTimers();
    const states: WebRtcSessionState[] = [];
    const fakeConnection = new FakePeerConnection();
    const hostSession = createHostSession({
      createPeerConnection: () => okAsync(fakeConnection),
      sendOffer: () => okAsync(undefined),
      sendIceCandidate: () => okAsync(undefined),
      onStateChanged: (_, state) => {
        states.push(state);
      },
      dataChannelOpenTimeoutMs: 100,
    });

    const startResult = await hostSession.startPeer("guest-timeout");
    expect(startResult.isOk()).toBe(true);
    await vi.advanceTimersByTimeAsync(101);

    expect(states).toEqual(["connecting", "failed", "closed", "closed"]);
    vi.useRealTimers();
  });

  it("client session times out when data channel never opens", async () => {
    vi.useFakeTimers();
    const states: WebRtcSessionState[] = [];
    const fakeConnection = new FakePeerConnection();
    const session = createClientSession({
      createPeerConnection: () => okAsync(fakeConnection),
      sendAnswer: () => okAsync(undefined),
      sendIceCandidate: () => okAsync(undefined),
      onStateChanged: (state) => {
        states.push(state);
      },
      onDataChannelOpened: () => undefined,
      dataChannelOpenTimeoutMs: 100,
    });

    const offerResult = await session.receiveOffer("host-timeout", "offer-sdp");
    expect(offerResult.isOk()).toBe(true);
    await vi.advanceTimersByTimeAsync(101);

    expect(states).toEqual(["connecting", "failed", "closed", "closed"]);
    vi.useRealTimers();
  });
});
