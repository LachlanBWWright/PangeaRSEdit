import { Result } from "neverthrow";

export function createPeerConnection(
  iceServers: readonly RTCIceServer[],
): Result<RTCPeerConnection, string> {
  return Result.fromThrowable(
    () =>
      new RTCPeerConnection({
        iceServers: [...iceServers],
      }),
    () => "Failed to create RTCPeerConnection",
  )();
}
