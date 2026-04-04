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

function normalizeRepositoryFilePath(
  repository: GameRepository,
  filePath: string,
): string {
  const trimmedPath = filePath.replace(/^\/+/, "");
  const sourcePrefix = `${repository.sourcePath}/`;

  if (trimmedPath.startsWith(sourcePrefix)) {
    return trimmedPath.slice(sourcePrefix.length);
  }

  return trimmedPath;
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
    sourcePath: "Source",
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
    sourcePath: "Source",
  },
  cromag: {
    owner: "jorio",
    repo: "CroMagRally",
    branch: "master",
    sourcePath: "Source",
  },
  billyfrontier: {
    owner: "jorio",
    repo: "BillyFrontier",
    branch: "master",
    sourcePath: "Source",
  },
  mightymike: {
    owner: "jorio",
    repo: "MightyMike",
    branch: "master",
    sourcePath: "src",
  },
};

export function getGameKeyFromName(gameName: string): string | null {
  const normalizedName = gameName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (const [key, repo] of Object.entries(GAME_REPOSITORIES)) {
    const normalizedRepo = repo.repo.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (normalizedRepo === normalizedName) {
      return key;
    }
  }
  return null;
}

/**
 * Get the GitHub raw content URL for a file in a game's repository
 */
export function getGitHubRawUrl(game: string, filePath: string): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  const normalizedPath = normalizeRepositoryFilePath(repo, filePath);

  // Construct the raw GitHub URL
  // Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${repo.sourcePath}/${normalizedPath}`;
}

/**
 * Get the GitHub permalink URL for a file at a specific line number
 */
export function getGitHubPermalink(game: string, filePath: string, lineNumber: number): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  const normalizedPath = normalizeRepositoryFilePath(repo, filePath);

  // Format: https://github.com/{owner}/{repo}/blob/{branch}/{path}#L{line}
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${repo.sourcePath}/${normalizedPath}#L${lineNumber}`;
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
