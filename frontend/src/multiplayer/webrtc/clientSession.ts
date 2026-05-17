import { ResultAsync, errAsync } from "neverthrow";
import type {
  HostPeerConnection,
  HostSessionDataChannel,
  WebRtcSessionState,
} from "./hostSession";

export interface ClientSessionDeps {
  readonly createPeerConnection: () => ResultAsync<HostPeerConnection, string>;
  readonly sendAnswer: (
    targetParticipantId: string,
    sdp: string,
  ) => ResultAsync<void, string>;
  readonly sendIceCandidate: (
    targetParticipantId: string,
    candidate: string,
  ) => ResultAsync<void, string>;
  readonly onStateChanged: (state: WebRtcSessionState) => void;
  readonly onDataChannelOpened: (channel: HostSessionDataChannel) => void;
  readonly dataChannelOpenTimeoutMs?: number;
}

export interface ClientSession {
  readonly receiveOffer: (
    sourceParticipantId: string,
    sdp: string,
  ) => ResultAsync<void, string>;
  readonly applyIceCandidate: (candidate: string) => ResultAsync<void, string>;
  readonly close: () => void;
}

const OFFER_APPLY_TIMEOUT_MS = 15_000;
const ANSWER_CREATE_TIMEOUT_MS = 15_000;
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

export function createClientSession(deps: ClientSessionDeps): ClientSession {
  let peerConnection: HostPeerConnection | null = null;
  let openTimeoutId: number | null = null;
  const dataChannelOpenTimeoutMs =
    deps.dataChannelOpenTimeoutMs ?? DATA_CHANNEL_OPEN_TIMEOUT_MS;

  const close = (): void => {
    if (openTimeoutId !== null) {
      window.clearTimeout(openTimeoutId);
      openTimeoutId = null;
    }
    if (!peerConnection) {
      return;
    }
    peerConnection.close();
    peerConnection = null;
    deps.onStateChanged("closed");
  };

  const applyIceCandidate = (candidate: string): ResultAsync<void, string> => {
    if (!peerConnection) {
      return errAsync("Peer connection is not active");
    }
    return ResultAsync.fromPromise(
      peerConnection.addIceCandidate({ candidate }),
      () => "Failed to apply ICE candidate",
    );
  };

  return {
    receiveOffer: (sourceParticipantId, sdp) => {
      deps.onStateChanged("connecting");
      return deps.createPeerConnection().andThen((connection) => {
        peerConnection = connection;
        openTimeoutId = window.setTimeout(() => {
          deps.onStateChanged("failed");
          close();
        }, dataChannelOpenTimeoutMs);
        connection.onconnectionstatechange = () => {
          const mappedState = mapConnectionState(connection.connectionState);
          if (mappedState) {
            deps.onStateChanged(mappedState);
          }
        };
        connection.onicecandidate = (event) => {
          if (!event.candidate || !event.candidate.candidate) {
            return;
          }
          void deps.sendIceCandidate(
            sourceParticipantId,
            event.candidate.candidate,
          );
        };
        const attachDataChannel = (channel: HostSessionDataChannel): void => {
          channel.onopen = () => {
            if (openTimeoutId !== null) {
              window.clearTimeout(openTimeoutId);
              openTimeoutId = null;
            }
            deps.onStateChanged("connected");
            deps.onDataChannelOpened(channel);
          };
          channel.onclose = () => {
            if (openTimeoutId !== null) {
              window.clearTimeout(openTimeoutId);
              openTimeoutId = null;
            }
            deps.onStateChanged("closed");
          };
        };
        connection.ondatachannel = (event) => {
          attachDataChannel(event.channel);
        };

        return ResultAsync.fromPromise(
          withTimeout(
            connection.setRemoteDescription({
              type: "offer",
              sdp,
            }),
            OFFER_APPLY_TIMEOUT_MS,
            "Timed out applying remote WebRTC offer",
          ),
          () => "Failed to apply remote WebRTC offer",
        )
          .andThen(() => {
            return ResultAsync.fromPromise(
              withTimeout(
                connection.createAnswer(),
                ANSWER_CREATE_TIMEOUT_MS,
                "Timed out creating WebRTC answer",
              ),
              () => "Failed to create WebRTC answer",
            );
          })
          .andThen((answer) => {
            return ResultAsync.fromPromise(
              connection.setLocalDescription(answer),
              () => "Failed to set local WebRTC answer",
            ).map(() => answer);
          })
          .andThen((answer) => {
            if (!answer.sdp) {
              return errAsync("Generated answer is missing SDP");
            }
            return deps.sendAnswer(sourceParticipantId, answer.sdp);
          });
      });
    },

    applyIceCandidate,
    close,
  };
}
