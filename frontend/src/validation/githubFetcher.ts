import fetch from "node-fetch";

export interface FetchResult {
  success: boolean;
  content?: string;
  lines?: string[];
  error?: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  retryDelay: number;
  maxRetries: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequestsPerMinute: 60,
  retryDelay: 1000,
  maxRetries: 3,
};

/**
 * Fetch a file from a GitHub repository
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<FetchResult> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
      };
    }

    const content = await response.text();
    const lines = content.split(/\r?\n/);

    return {
      success: true,
      content,
      lines,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Get specific lines from a file
 */
export async function fetchFileLines(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  startLine: number,
  endLine: number,
): Promise<FetchResult> {
  const result = await fetchGitHubFile(owner, repo, branch, path);

  if (!result.success || !result.lines) {
    return result;
  }

  // Lines are 1-based in citations, but 0-based in array
  const lines = result.lines.slice(startLine - 1, endLine);
  const content = lines.join("\n");

  return {
    success: true,
    content,
    lines,
  };
}

/**
 * Cache fetched files to avoid rate limiting
 */
export class GitHubFileCache {
  private cache: Map<string, Promise<FetchResult>>;

  constructor() {
    this.cache = new Map();
  }

  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<FetchResult> {
    const key = `${owner}/${repo}/${branch}/${path}`;

    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Create the promise and cache it immediately to handle concurrent requests for same file
    const promise = fetchGitHubFile(owner, repo, branch, path);
    this.cache.set(key, promise);

    const result = await promise;

    // If it failed, remove from cache so we can retry later
    if (!result.success) {
      this.cache.delete(key);
    }

    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
