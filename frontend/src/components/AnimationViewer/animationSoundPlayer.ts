import decodeAiff from "@audio/decode-aiff";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";
import { mapErr } from "@/utils/mapErr";
import type { ModelSourceKind } from "./animationEventUtils";

const SOUND_EVENT_ASSET_PATHS_BY_GAME: Record<
  string,
  Record<number, string>
> = {
  "Bugdom 1": {
    0: "games/pangea-ports/games/Bugdom-android/Data/Audio/Main.sounds/Kick.aiff",
    1: "games/pangea-ports/games/Bugdom-android/Data/Audio/Pond.sounds/Waterbug.aiff",
  },
  "Nanosaur 1": {
    0: "games/pangea-ports/games/Nanosaur-android/Data/Audio/SoundBank/Crunch.aiff",
    1: "games/pangea-ports/games/Nanosaur-android/Data/Audio/SoundBank/Footstep.aiff",
    2: "games/pangea-ports/games/Nanosaur-android/Data/Audio/SoundBank/DiloAttack.aiff",
    3: "games/pangea-ports/games/Nanosaur-android/Data/Audio/SoundBank/WingFlap.aiff",
    4: "games/pangea-ports/games/Nanosaur-android/Data/Audio/SoundBank/Footstep.aiff",
  },
  "Otto Matic": {
    0: "games/pangea-ports/games/OttoMatic-Android/Data/Audio/Farm.sounds/OnionSwoosh.aiff",
    3: "games/pangea-ports/games/OttoMatic-Android/Data/Audio/Main.sounds/LeftFoot.aiff",
    4: "games/pangea-ports/games/OttoMatic-Android/Data/Audio/Main.sounds/RightFoot.aiff",
    5: "games/pangea-ports/games/OttoMatic-Android/Data/Audio/Jungle.sounds/PitcherPuke.aiff",
    6: "games/pangea-ports/games/OttoMatic-Android/Data/Audio/Jungle.sounds/Flytrap.aiff",
  },
  "Bugdom 2": {
    0: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Garden/GnomeStep.aiff",
    1: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Garden/GnomeStep.aiff",
    2: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Fido/TickStep.aiff",
    3: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Title/Stomp.aiff",
    4: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Closet/Servo1.aiff",
    5: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Closet/Servo2.aiff",
    6: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Park/AntBite.aiff",
    7: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Main/SnapTrap.aiff",
    8: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Playroom/OttoFall.aiff",
    9: "games/pangea-ports/games/Bugdom2-Android/Data/Audio/Main/Footstep.aiff",
  },
  "Billy Frontier": {
    0: "games/pangea-ports/games/BillyFrontier-Android/Data/Audio/SoundBank/Spurs2.aiff",
    1: "games/pangea-ports/games/BillyFrontier-Android/Data/Audio/SoundBank/WalkerCrash.aiff",
    2: "games/pangea-ports/games/BillyFrontier-Android/Data/Audio/SoundBank/WalkerFootStep.aiff",
  },
};

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

  return SOUND_EVENT_ASSET_PATHS_BY_GAME[gameLabel]?.[value] ?? null;
}

function buildMountedAssetUrl(relativePath: string): string {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(relativePath, appBaseUrl).toString();
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

export function hasAnimationEventSoundPreview(
  value: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
): boolean {
  return resolveSoundAssetPath(value, modelSourceKind, gameLabel) !== null;
}

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
