import { describe, expect, it } from "vitest";
import {
  getAnimationSoundAssetPath,
  listAnimationSoundAssets,
} from "@/components/AnimationViewer/animationSoundAssets";

describe("animation sound assets", () => {
  it("maps supported game sound events to source assets", () => {
    expect(getAnimationSoundAssetPath("Otto Matic", 3)).toBe(
      "games/OttoMatic-Android/Data/Audio/Main.sounds/LeftFoot.aiff",
    );
    expect(getAnimationSoundAssetPath("Bugdom 2", 9)).toBe(
      "games/Bugdom2-Android/Data/Audio/Main/Footstep.aiff",
    );
  });

  it("returns no asset for unknown games and unmapped sounds", () => {
    expect(getAnimationSoundAssetPath("Otto Matic", 999)).toBeNull();
    expect(getAnimationSoundAssetPath("Unknown", 0)).toBeNull();
    expect(getAnimationSoundAssetPath(null, 0)).toBeNull();
  });

  it("deduplicates assets shared by multiple event values", () => {
    const assets = listAnimationSoundAssets();
    expect(new Set(assets).size).toBe(assets.length);
    expect(assets).toContain(
      "games/Nanosaur-android/Data/Audio/SoundBank/Footstep.aiff",
    );
  });
});
