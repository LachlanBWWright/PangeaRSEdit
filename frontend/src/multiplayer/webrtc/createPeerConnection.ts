import { Result } from "neverthrow";
import type {
  HostPeerConnection,
  HostSessionDataChannel,
} from "./hostSession";

function adaptDataChannel(channel: RTCDataChannel): HostSessionDataChannel {
  let onopen: (() => void) | null = null;
  let onclose: (() => void) | null = null;
  const messageListeners = new Set<(
    event: { readonly data: unknown },
  ) => void>();

  channel.binaryType = "arraybuffer";

  channel.addEventListener("open", () => {
    onopen?.();
  });
  channel.addEventListener("close", () => {
    onclose?.();
  });
  channel.addEventListener("message", (event) => {
    const wrappedEvent = { data: event.data };
    for (const listener of messageListeners) {
      listener(wrappedEvent);
    }
  });

  return {
    get label() {
      return channel.label;
    },
    get readyState() {
      return channel.readyState;
    },
    get bufferedAmount() {
      return channel.bufferedAmount;
    },
    get onopen() {
      return onopen;
    },
    set onopen(handler) {
      onopen = handler;
    },
    get onclose() {
      return onclose;
    },
    set onclose(handler) {
      onclose = handler;
    },
    send(data: ArrayBuffer) {
      channel.send(data);
    },
    addEventListener(type, listener) {
      if (type === "message") {
        messageListeners.add(listener);
      }
    },
    removeEventListener(type, listener) {
      if (type === "message") {
        messageListeners.delete(listener);
      }
    },
  };
}

function adaptPeerConnection(connection: RTCPeerConnection): HostPeerConnection {
  let onicecandidate:
    | ((event: { readonly candidate: RTCIceCandidateInit | null }) => void)
    | null = null;
  let onconnectionstatechange: (() => void) | null = null;
  let ondatachannel:
    | ((event: { readonly channel: HostSessionDataChannel }) => void)
    | null = null;

  connection.onicecandidate = (event) => {
    onicecandidate?.({
      candidate: event.candidate
        ? {
            candidate: event.candidate.candidate,
          }
        : null,
    });
  };
  connection.onconnectionstatechange = () => {
    onconnectionstatechange?.();
  };
  connection.ondatachannel = (event) => {
    ondatachannel?.({ channel: adaptDataChannel(event.channel) });
  };

  return {
    get connectionState() {
      return connection.connectionState;
    },
    get onicecandidate() {
      return onicecandidate;
    },
    set onicecandidate(handler) {
      onicecandidate = handler;
    },
    get onconnectionstatechange() {
      return onconnectionstatechange;
    },
    set onconnectionstatechange(handler) {
      onconnectionstatechange = handler;
    },
    get ondatachannel() {
      return ondatachannel;
    },
    set ondatachannel(handler) {
      ondatachannel = handler;
    },
    createDataChannel(label, options) {
      return adaptDataChannel(connection.createDataChannel(label, options));
    },
    createOffer() {
      return connection.createOffer();
    },
    createAnswer() {
      return connection.createAnswer();
    },
    setLocalDescription(description) {
      return connection.setLocalDescription(description);
    },
    setRemoteDescription(description) {
      return connection.setRemoteDescription(description);
    },
    addIceCandidate(candidate) {
      return connection.addIceCandidate(candidate);
    },
    close() {
      connection.close();
    },
  };
}

export function createPeerConnection(
  iceServers: readonly RTCIceServer[],
): Result<HostPeerConnection, string> {
  return Result.fromThrowable(
    () =>
      adaptPeerConnection(
        new RTCPeerConnection({
          iceServers: [...iceServers],
        }),
      ),
    () => "Failed to create RTCPeerConnection",
  )();
}
