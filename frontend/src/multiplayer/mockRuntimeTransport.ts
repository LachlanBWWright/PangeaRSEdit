import { Result, err, ok } from "neverthrow";
import { z } from "zod";
import type { MultiplayerRuntimeManagedTransport } from "./runtimeBridge";

const channelMessageSchema = z.object({
  kind: z.enum(["reliable", "unreliable"]),
  payload: z.instanceof(ArrayBuffer),
  senderParticipantId: z.string().min(1),
});

export interface MockRuntimeTransportOptions {
  readonly matchId: string;
  readonly participantId: string;
}

export interface MockRuntimeTransportHandle {
  readonly transport: MultiplayerRuntimeManagedTransport;
  readonly dispose: () => void;
}

function cloneBuffer(source: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(source.byteLength);
  new Uint8Array(copy).set(new Uint8Array(source));
  return copy;
}

function createNoopHandle(): MockRuntimeTransportHandle {
  const transport: MultiplayerRuntimeManagedTransport = {
    sendReliable: () => ok(undefined),
    sendUnreliable: () => ok(undefined),
    reportDesync: () => undefined,
    reportMatchEnded: () => undefined,
    subscribeIncoming: () => () => undefined,
  };
  return {
    transport,
    dispose: () => undefined,
  };
}

export function createMockRuntimeTransport(
  options: MockRuntimeTransportOptions,
): MockRuntimeTransportHandle {
  const { matchId, participantId } = options;
  const subscribers = new Set<(bytes: ArrayBuffer) => void>();

  if (!Reflect.has(globalThis, "BroadcastChannel")) {
    return createNoopHandle();
  }

  const channelName = `pangea-runtime-${matchId}`;
  const createChannelResult = Result.fromThrowable(
    () => new BroadcastChannel(channelName),
    () => "Unable to create BroadcastChannel transport",
  )();

  if (createChannelResult.isErr()) {
    return createNoopHandle();
  }

  const channel = createChannelResult.value;
  const onMessage = (event: MessageEvent<unknown>): void => {
    const parsed = channelMessageSchema.safeParse(event.data);
    if (!parsed.success) {
      return;
    }

    if (parsed.data.senderParticipantId === participantId) {
      return;
    }

    const bytes = cloneBuffer(parsed.data.payload);
    for (const subscriber of subscribers) {
      subscriber(bytes);
    }
  };

  channel.addEventListener("message", onMessage);

  const postPacket = (
    kind: "reliable" | "unreliable",
    bytes: ArrayBuffer,
  ): Result<void, string> => {
    const payload = cloneBuffer(bytes);
    const sendResult = Result.fromThrowable(
      () =>
        channel.postMessage({
          kind,
          payload,
          senderParticipantId: participantId,
        }),
      () => "Unable to send multiplayer packet",
    )();

    if (sendResult.isErr()) {
      return err(sendResult.error);
    }

    return ok(undefined);
  };

  const transport: MultiplayerRuntimeManagedTransport = {
    sendReliable: (bytes) => postPacket("reliable", bytes),
    sendUnreliable: (bytes) => postPacket("unreliable", bytes),
    reportDesync: () => undefined,
    reportMatchEnded: () => undefined,
    subscribeIncoming: (onPacket) => {
      subscribers.add(onPacket);
      return () => {
        subscribers.delete(onPacket);
      };
    },
  };

  return {
    transport,
    dispose: () => {
      subscribers.clear();
      channel.removeEventListener("message", onMessage);
      channel.close();
    },
  };
}
