import { ResultAsync, errAsync } from "neverthrow";

export type WebRtcSessionState =
  | "connecting"
  | "connected"
  | "failed"
  | "closed";

export interface HostSessionDataChannel {
  readonly label: string;
  readonly readyState: string;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  bufferedAmount?: number;
  send(data: ArrayBuffer): void;
  addEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: { readonly data: unknown }) => void,
  ): void;
}

export interface HostPeerConnection {
  readonly connectionState: string;
  onicecandidate:
    | ((event: { readonly candidate: RTCIceCandidateInit | null }) => void)
    | null;
  onconnectionstatechange: (() => void) | null;
  ondatachannel:
    | ((event: { readonly channel: HostSessionDataChannel }) => void)
    | null;
  createDataChannel(
    label: string,
    options: { readonly ordered: boolean; readonly maxRetransmits?: number },
  ): HostSessionDataChannel;
  createOffer(): Promise<RTCSessionDescriptionInit>;
  createAnswer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;
  addIceCandidate(candidate: RTCIceCandidateInit): Promise<void>;
  close(): void;
}

interface HostPeerHandle {
  readonly connection: HostPeerConnection;
  readonly controlChannel: HostSessionDataChannel;
  readonly stateChannel: HostSessionDataChannel;
  readonly openTimeoutId: number;
  readonly opened: {
    control: boolean;
    state: boolean;
  };
}

export interface HostSessionDeps {
  readonly createPeerConnection: (
    participantId: string,
  ) => ResultAsync<HostPeerConnection, string>;
  readonly sendOffer: (
    targetParticipantId: string,
    sdp: string,
  ) => ResultAsync<void, string>;
  readonly sendIceCandidate: (
    targetParticipantId: string,
    candidate: string,
  ) => ResultAsync<void, string>;
  readonly onStateChanged: (
    participantId: string,
    state: WebRtcSessionState,
  ) => void;
  readonly onDataChannelOpened?: (
    participantId: string,
    channels: {
      readonly controlChannel: HostSessionDataChannel;
      readonly stateChannel: HostSessionDataChannel;
    },
  ) => void;
  readonly dataChannelOpenTimeoutMs?: number;
}

export interface HostSession {
  readonly startPeer: (participantId: string) => ResultAsync<void, string>;
  readonly applyAnswer: (
    participantId: string,
    sdp: string,
  ) => ResultAsync<void, string>;
  readonly applyIceCandidate: (
    participantId: string,
    candidate: string,
  ) => ResultAsync<void, string>;
  readonly closePeer: (participantId: string) => void;
  readonly closeAll: () => void;
}

const OFFER_TIMEOUT_MS = 15_000;
const ANSWER_APPLY_TIMEOUT_MS = 15_000;
const DATA_CHANNEL_OPEN_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(message);
    }, timeoutMs);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function mapConnectionState(state: string): WebRtcSessionState | null {
  if (state === "connected") {
    return "connected";
  }
  if (state === "failed" || state === "disconnected") {
    return "failed";
  }
  if (state === "closed") {
    return "closed";
  }
  return null;
}

export function createHostSession(deps: HostSessionDeps): HostSession {
  const peers = new Map<string, HostPeerHandle>();
  const dataChannelOpenTimeoutMs =
    deps.dataChannelOpenTimeoutMs ?? DATA_CHANNEL_OPEN_TIMEOUT_MS;

  const closePeer = (participantId: string): void => {
    const peer = peers.get(participantId);
    if (!peer) {
      return;
    }
    window.clearTimeout(peer.openTimeoutId);
    peer.connection.close();
    peers.delete(participantId);
    deps.onStateChanged(participantId, "closed");
  };

  return {
    startPeer: (participantId) => {
      deps.onStateChanged(participantId, "connecting");
      return deps.createPeerConnection(participantId).andThen((connection) => {
        const controlChannel = connection.createDataChannel("pangea-control", {
          ordered: true,
        });
        const stateChannel = connection.createDataChannel("pangea-state", {
          ordered: false,
          maxRetransmits: 0,
        });
        const openTimeoutId = window.setTimeout(() => {
          deps.onStateChanged(participantId, "failed");
          closePeer(participantId);
        }, dataChannelOpenTimeoutMs);
        const opened = {
          control: false,
          state: false,
        };
        const notifyOpenedIfReady = (): void => {
          if (!opened.control || !opened.state) {
            return;
          }
          window.clearTimeout(openTimeoutId);
          deps.onStateChanged(participantId, "connected");
          deps.onDataChannelOpened?.(participantId, {
            controlChannel,
            stateChannel,
          });
        };
        controlChannel.onopen = () => {
          opened.control = true;
          notifyOpenedIfReady();
        };
        stateChannel.onopen = () => {
          opened.state = true;
          notifyOpenedIfReady();
        };
        const onChannelClose = () => {
          window.clearTimeout(openTimeoutId);
          deps.onStateChanged(participantId, "closed");
        };
        controlChannel.onclose = onChannelClose;
        stateChannel.onclose = onChannelClose;

        connection.onconnectionstatechange = () => {
          const mappedState = mapConnectionState(connection.connectionState);
          if (mappedState) {
            deps.onStateChanged(participantId, mappedState);
          }
        };
        connection.onicecandidate = (event) => {
          if (!event.candidate || !event.candidate.candidate) {
            return;
          }
          void deps.sendIceCandidate(participantId, event.candidate.candidate);
        };

        peers.set(participantId, {
          connection,
          controlChannel,
          stateChannel,
          openTimeoutId,
          opened,
        });

        return ResultAsync.fromPromise(
          withTimeout(
            connection.createOffer(),
            OFFER_TIMEOUT_MS,
            "Timed out creating WebRTC offer",
          ),
          () => {
            return "Failed to create WebRTC offer";
          },
        )
          .andThen((offer) => {
            return ResultAsync.fromPromise(
              connection.setLocalDescription(offer),
              () => "Failed to set local WebRTC offer",
            ).map(() => offer);
          })
          .andThen((offer) => {
            if (!offer.sdp) {
              return errAsync("Generated offer is missing SDP");
            }
            return deps.sendOffer(participantId, offer.sdp);
          });
      });
    },

    applyAnswer: (participantId, sdp) => {
      const peer = peers.get(participantId);
      if (!peer) {
        return errAsync("Peer is not active");
      }
      return ResultAsync.fromPromise(
        withTimeout(
          peer.connection.setRemoteDescription({
            type: "answer",
            sdp,
          }),
          ANSWER_APPLY_TIMEOUT_MS,
          "Timed out applying remote WebRTC answer",
        ),
        () => "Failed to apply remote WebRTC answer",
      );
    },

    applyIceCandidate: (participantId, candidate) => {
      const peer = peers.get(participantId);
      if (!peer) {
        return errAsync("Peer is not active");
      }
      return ResultAsync.fromPromise(
        peer.connection.addIceCandidate({ candidate }),
        () => "Failed to apply remote ICE candidate",
      );
    },

    closePeer,

    closeAll: () => {
      for (const participantId of peers.keys()) {
        closePeer(participantId);
      }
    },
  };
}
