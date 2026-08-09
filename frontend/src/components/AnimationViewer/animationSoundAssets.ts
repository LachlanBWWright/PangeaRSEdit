export const SOUND_EVENT_ASSET_PATHS_BY_GAME: Record<
  string,
  Record<number, string>
> = {
  "Bugdom 1": {
    0: "games/Bugdom-android/Data/Audio/Main.sounds/Kick.aiff",
    1: "games/Bugdom-android/Data/Audio/Pond.sounds/Waterbug.aiff",
  },
  "Nanosaur 1": {
    0: "games/Nanosaur-android/Data/Audio/SoundBank/Crunch.aiff",
    1: "games/Nanosaur-android/Data/Audio/SoundBank/Footstep.aiff",
    2: "games/Nanosaur-android/Data/Audio/SoundBank/DiloAttack.aiff",
    3: "games/Nanosaur-android/Data/Audio/SoundBank/WingFlap.aiff",
    4: "games/Nanosaur-android/Data/Audio/SoundBank/Footstep.aiff",
  },
  "Otto Matic": {
    0: "games/OttoMatic-Android/Data/Audio/Farm.sounds/OnionSwoosh.aiff",
    3: "games/OttoMatic-Android/Data/Audio/Main.sounds/LeftFoot.aiff",
    4: "games/OttoMatic-Android/Data/Audio/Main.sounds/RightFoot.aiff",
    5: "games/OttoMatic-Android/Data/Audio/Jungle.sounds/PitcherPuke.aiff",
    6: "games/OttoMatic-Android/Data/Audio/Jungle.sounds/Flytrap.aiff",
  },
  "Bugdom 2": {
    0: "games/Bugdom2-Android/Data/Audio/Garden/GnomeStep.aiff",
    1: "games/Bugdom2-Android/Data/Audio/Garden/GnomeStep.aiff",
    2: "games/Bugdom2-Android/Data/Audio/Fido/TickStep.aiff",
    3: "games/Bugdom2-Android/Data/Audio/Title/Stomp.aiff",
    4: "games/Bugdom2-Android/Data/Audio/Closet/Servo1.aiff",
    5: "games/Bugdom2-Android/Data/Audio/Closet/Servo2.aiff",
    6: "games/Bugdom2-Android/Data/Audio/Park/AntBite.aiff",
    7: "games/Bugdom2-Android/Data/Audio/Main/SnapTrap.aiff",
    8: "games/Bugdom2-Android/Data/Audio/Playroom/OttoFall.aiff",
    9: "games/Bugdom2-Android/Data/Audio/Main/Footstep.aiff",
  },
  "Billy Frontier": {
    0: "games/BillyFrontier-Android/Data/Audio/SoundBank/Spurs2.aiff",
    1: "games/BillyFrontier-Android/Data/Audio/SoundBank/WalkerCrash.aiff",
    2: "games/BillyFrontier-Android/Data/Audio/SoundBank/WalkerFootStep.aiff",
  },
};

export function listAnimationSoundAssets(): string[] {
  return [...new Set(Object.values(SOUND_EVENT_ASSET_PATHS_BY_GAME).flatMap(
    (sounds) => Object.values(sounds),
  ))];
}

export function getAnimationSoundAssetPath(
  gameLabel: string | null | undefined,
  value: number,
): string | null {
  if (!gameLabel) return null;
  return SOUND_EVENT_ASSET_PATHS_BY_GAME[gameLabel]?.[value] ?? null;
}
