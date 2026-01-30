/**
 * Game Source Repository Mapping
 * 
 * Maps game names to their GitHub repositories for citation verification.
 * These are the original Pangea game source code repositories maintained by jorio.
 */

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
  cromag: {
    owner: "jorio",
    repo: "CroMag-Rally",
    branch: "master",
    sourcePath: "src",
  },
  billyfrontier: {
    owner: "jorio",
    repo: "BillyFrontier",
    branch: "master",
    sourcePath: "src",
  },
  mightymike: {
    owner: "jorio",
    repo: "MightyMike",
    branch: "master",
    sourcePath: "src",
  },
};

/**
 * Get the GitHub raw content URL for a file in a game's repository
 */
export function getGitHubRawUrl(game: string, filePath: string): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  
  // Construct the raw GitHub URL
  // Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${repo.sourcePath}/${filePath}`;
}

/**
 * Get the GitHub permalink URL for a file at a specific line number
 */
export function getGitHubPermalink(game: string, filePath: string, lineNumber: number): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  
  // Format: https://github.com/{owner}/{repo}/blob/{branch}/{path}#L{line}
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${repo.sourcePath}/${filePath}#L${lineNumber}`;
}

/**
 * Check if a game has a known repository
 */
export function hasKnownRepository(game: string): boolean {
  return game in GAME_REPOSITORIES;
}

/**
 * Get all known game names
 */
export function getKnownGames(): string[] {
  return Object.keys(GAME_REPOSITORIES);
}
