export interface GameRepository {
  owner: string;
  repo: string;
  branch: string;
  sourcePath: string;  // Path to Source directory
}

export const GAME_REPOSITORIES: Record<string, GameRepository> = {
  ottomatic: {
    owner: "jorio",
    repo: "OttoMatic",
    branch: "master",
    sourcePath: "src",
  },
  bugdom2: {
    owner: "jorio",
    repo: "Bugdom2",
    branch: "master",
    sourcePath: "src",
  },
  bugdom: {
    owner: "jorio",
    repo: "Bugdom",
    branch: "master",
    sourcePath: "src",
  },
  nanosaur: {
    owner: "jorio",
    repo: "Nanosaur",
    branch: "master",
    sourcePath: "src",
  },
  nanosaur2: {
    owner: "jorio",
    repo: "Nanosaur2",
    branch: "master",
    sourcePath: "src",
  },
  cromagrally: {
    owner: "jorio",
    repo: "CroMagRally",
    branch: "master",
    sourcePath: "src",
  },
  billyfrontier: {
    owner: "jorio",
    repo: "BillyFrontier",
    branch: "master",
    sourcePath: "src",
  },
};
