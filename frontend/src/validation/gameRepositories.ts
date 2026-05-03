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
  sourcePath: string; // Path to Source directory
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

/** Resolves a game name to its repository key when that repository is known. */
export function getGameKeyFromName(gameName: string): string | null {
  const normalizedName = gameName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const match = Object.entries(GAME_REPOSITORIES).find(
    ([, repo]) =>
      repo.repo.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalizedName,
  );
  return match?.[0] ?? null;
}

/** Builds the GitHub raw-content URL for a file in a game's repository. */
export function getGitHubRawUrl(game: string, filePath: string): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  const normalizedPath = normalizeRepositoryFilePath(repo, filePath);

  // Construct the raw GitHub URL
  // Format: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${repo.branch}/${repo.sourcePath}/${normalizedPath}`;
}

/** Builds the GitHub permalink URL for a file at a specific line number. */
export function getGitHubPermalink(
  game: string,
  filePath: string,
  lineNumber: number,
): string | null {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) return null;
  const normalizedPath = normalizeRepositoryFilePath(repo, filePath);

  // Format: https://github.com/{owner}/{repo}/blob/{branch}/{path}#L{line}
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${repo.sourcePath}/${normalizedPath}#L${lineNumber}`;
}

/** Returns true when the game name maps to a known repository definition. */
export function hasKnownRepository(game: string): boolean {
  return game in GAME_REPOSITORIES;
}

/** Returns all game keys that have repository metadata available. */
export function getKnownGames(): string[] {
  return Object.keys(GAME_REPOSITORIES);
}
