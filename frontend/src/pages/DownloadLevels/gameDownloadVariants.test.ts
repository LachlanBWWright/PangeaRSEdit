import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  GAME_DOWNLOAD_CONFIGS,
  getGameDownloadConfig,
  getGameDownloadUrl,
} from "./gameDownloadVariants";

describe("game download variants", () => {
  it("provides all four native variants for every imported game", () => {
    expect(GAME_DOWNLOAD_CONFIGS).toHaveLength(8);

    for (const config of GAME_DOWNLOAD_CONFIGS) {
      expect(config.variants.map((variant) => variant.id)).toEqual([
        "linux",
        "macos",
        "windows",
        "android",
      ]);
    }
  });

  it("maps Otto Matic to a direct Pages download URL", () => {
    const config = getGameDownloadConfig(Game.OTTO_MATIC);
    expect(config).toBeDefined();
    expect(config?.variants[0]?.fileName).toBe(
      "OttoMatic-Android-linux.AppImage",
    );
    expect(
      getGameDownloadUrl(
        "OttoMatic-Android",
        "OttoMatic-Android-android.apk",
      ),
    ).toBe(
      "/downloads/OttoMatic-Android/OttoMatic-Android-android.apk",
    );
  });
});
