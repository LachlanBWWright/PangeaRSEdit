import type { GameVerificationConfig } from "./types";

/**
 * Game verification configurations mapping game keys to their GitHub repositories
 */
export const GAME_VERIFICATION_CONFIGS: Record<string, GameVerificationConfig> =
  {
    ottoMatic: {
      game: "Otto Matic",
      repoOwner: "jorio",
      repoName: "OttoMatic",
      basePath: "src",
      branch: "master",
    },
    bugdom: {
      game: "Bugdom",
      repoOwner: "jorio",
      repoName: "Bugdom",
      basePath: "src",
      branch: "master",
    },
    bugdom2: {
      game: "Bugdom 2",
      repoOwner: "jorio",
      repoName: "Bugdom2",
      basePath: "Source",
      branch: "master",
    },
    billyFrontier: {
      game: "Billy Frontier",
      repoOwner: "jorio",
      repoName: "BillyFrontier",
      basePath: "Source",
      branch: "master",
    },
    nanosaur: {
      game: "Nanosaur",
      repoOwner: "jorio",
      repoName: "Nanosaur",
      basePath: "src",
      branch: "master",
    },
    nanosaur2: {
      game: "Nanosaur 2",
      repoOwner: "jorio",
      repoName: "Nanosaur2",
      basePath: "Source",
      branch: "master",
    },
    croMag: {
      game: "Cro-Mag Rally",
      repoOwner: "jorio",
      repoName: "CroMag",
      basePath: "src",
      branch: "master",
    },
  };
