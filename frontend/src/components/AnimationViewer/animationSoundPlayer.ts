import decodeAiff from "@audio/decode-aiff";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import type { ModelSourceKind } from "./animationEventUtils";
import { getAnimationSoundAssetPath } from "./animationSoundAssets";

const decodedBufferCache = new Map<string, AudioBuffer>();
let sharedAudioContext: AudioContext | null = null;

function resolveSoundAssetPath(
  value: number,
  _modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
): string | null {
  if (!gameLabel) {
    return null;
  }

  return getAnimationSoundAssetPath(gameLabel, value);
}

function buildMountedAssetUrl(relativePath: string): string {
  if (import.meta.env.DEV) {
    return new URL(
      `/games/pangea-ports/${relativePath}`,
      window.location.origin,
    ).toString();
  }
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(`generated/pangea-ports/audio/${relativePath}`, appBaseUrl).toString();
}

function ensureAudioContext(): Result<AudioContext, string> {
  if (sharedAudioContext) {
    return ok(sharedAudioContext);
  }

  const contextResult = Result.fromThrowable(
    () => new AudioContext(),
    mapErr,
  )();
  if (contextResult.isErr()) {
    return err(`Could not create audio context: ${contextResult.error}`);
  }

  sharedAudioContext = contextResult.value;
  return ok(contextResult.value);
}

function resumeAudioContext(
  audioContext: AudioContext,
): ResultAsync<AudioContext, string> {
  if (audioContext.state === "running") {
    return okAsync(audioContext);
  }

  return ResultAsync.fromPromise(audioContext.resume(), mapErr).map(
    () => audioContext,
  );
}

function decodeSoundBuffer(
  audioContext: AudioContext,
  assetPath: string,
  buffer: ArrayBuffer,
): ResultAsync<AudioBuffer, string> {
  const cachedBuffer = decodedBufferCache.get(assetPath);
  if (cachedBuffer) {
    return okAsync(cachedBuffer);
  }

  const lowerPath = assetPath.toLowerCase();
  if (lowerPath.endsWith(".aiff") || lowerPath.endsWith(".aif")) {
    return ResultAsync.fromPromise(decodeAiff(buffer), mapErr).andThen(
      (audioData) => {
        const firstChannel = audioData.channelData[0];
        if (!firstChannel) {
          return errAsync(
            "Decoded AIFF buffer did not contain any audio samples.",
          );
        }

        const audioBufferResult = Result.fromThrowable(() => {
          const createdBuffer = audioContext.createBuffer(
            audioData.channelData.length,
            firstChannel.length,
            audioData.sampleRate,
          );
          audioData.channelData.forEach((channelData, channelIndex) => {
            const normalizedChannelData = new Float32Array(channelData.length);
            normalizedChannelData.set(channelData);
            createdBuffer.copyToChannel(normalizedChannelData, channelIndex);
          });
          return createdBuffer;
        }, mapErr)();

        if (audioBufferResult.isErr()) {
          return errAsync(
            `Could not decode AIFF audio: ${audioBufferResult.error}`,
          );
        }

        decodedBufferCache.set(assetPath, audioBufferResult.value);
        return okAsync(audioBufferResult.value);
      },
    );
  }

  return ResultAsync.fromPromise(
    audioContext.decodeAudioData(buffer.slice(0)),
    mapErr,
  ).map((decoded) => {
    decodedBufferCache.set(assetPath, decoded);
    return decoded;
  });
}

/** Returns true when the current animation event can produce a previewable sound. */
export function hasAnimationEventSoundPreview(
  value: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
): boolean {
  return resolveSoundAssetPath(value, modelSourceKind, gameLabel) !== null;
}

/** Fetches and plays the sound preview associated with an animation event, if any. */
export function playAnimationEventSound(
  value: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
): ResultAsync<void, string> {
  const assetPath = resolveSoundAssetPath(value, modelSourceKind, gameLabel);
  if (!assetPath) {
    return errAsync("No preview audio is mapped for this animation event.");
  }

  const audioContextResult = ensureAudioContext();
  if (audioContextResult.isErr()) {
    return errAsync(audioContextResult.error);
  }

  const assetUrl = buildMountedAssetUrl(assetPath);

  return resumeAudioContext(audioContextResult.value)
    .andThen(() =>
      ResultAsync.fromPromise(fetch(assetUrl), mapErr).andThen((response) => {
        if (!response.ok) {
          return errAsync(
            `Could not load preview audio (${response.status} ${response.statusText}).`,
          );
        }

        return ResultAsync.fromPromise(response.arrayBuffer(), mapErr);
      }),
    )
    .andThen((buffer) =>
      decodeSoundBuffer(audioContextResult.value, assetPath, buffer),
    )
    .andThen((decodedBuffer) => {
      const playbackResult = Result.fromThrowable(() => {
        const source = audioContextResult.value.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContextResult.value.destination);
        source.start(0);
      }, mapErr)();

      return playbackResult.isErr()
        ? errAsync(`Could not start preview audio: ${playbackResult.error}`)
        : okAsync(undefined);
    });
}
