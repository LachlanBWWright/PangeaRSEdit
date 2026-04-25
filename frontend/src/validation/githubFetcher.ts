/**
 * GitHub Content Fetcher
 *
 * Fetches source code from GitHub repositories for citation verification.
 * Includes caching to avoid rate limiting and retry logic for reliability.
 */

import { mapErr } from "@/utils/mapErr";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import { GAME_REPOSITORIES, type GameRepository } from "./gameRepositories";

/**
 * Result of fetching a file from GitHub
 */
export interface FetchResult {
  content: string;
  lines: string[];
  totalLines: number;
}

/**
 * Rate limiting configuration
 */
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

function createFetchResult(content: string): FetchResult {
  const lines = content.split("\n");
  return { content, lines, totalLines: lines.length };
}

function normalizeCandidatePaths(
  sourcePath: string,
  filePath: string,
): string[] {
  const tried = new Set<string>();
  return buildCandidatePaths(sourcePath, filePath)
    .map((candidate) => candidate.replace(/\/{2,}/g, "/"))
    .filter((candidate) => {
      if (tried.has(candidate)) return false;
      tried.add(candidate);
      return true;
    });
}

function extractLines(
  lines: string[],
  totalLines: number,
  startLine: number,
  endLine: number,
): Result<string[], string> {
  if (startLine < 1 || endLine < startLine) {
    return err("Invalid line range: ${startLine}-${endLine}");
  }

  if (startLine > totalLines) {
    return err(`Start line ${startLine} exceeds file length ${totalLines}`);
  }

  const actualEnd = Math.min(endLine, totalLines);
  return ok(lines.slice(startLine - 1, actualEnd));
}

function buildCandidatePaths(sourcePath: string, filePath: string): string[] {
  const normalizedPath = filePath.replace(/^\/+/, "");
  return [
    `${sourcePath}/${normalizedPath}`,
    normalizedPath,
    normalizedPath.startsWith("Source/")
      ? `${sourcePath}/${normalizedPath.slice("Source/".length)}`
      : `Source/${normalizedPath}`,
  ];
}

/**
 * Fetch a file from a GitHub repository
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<Result<FetchResult, string>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  let lastError: string | null = null;

  for (let attempt = 0; attempt < rateLimitConfig.maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry with exponential backoff
      await delay(rateLimitConfig.retryDelay * Math.pow(2, attempt - 1));
    }

    const fetchResult = await ResultAsync.fromPromise(fetch(url), mapErr);
    if (fetchResult.isErr()) {
      lastError = fetchResult.error;
      continue;
    }

    const response = fetchResult.value;

    if (!response.ok && response.status === 404) {
      return err(`File not found: ${path}`);
    }

    if (!response.ok && response.status === 403) {
      await delay(rateLimitConfig.retryDelay * 10);
      continue;
    }

    if (!response.ok) {
      return err(`HTTP ${response.status}: ${response.statusText}`);
    }

    const textResult = await ResultAsync.fromPromise(response.text(), mapErr);
    if (textResult.isErr()) {
      lastError = textResult.error;
      continue;
    }

    return ok(createFetchResult(textResult.value));
  }

  return err(lastError ?? "Unknown fetch error");
}

/**
 * Fetch a game source file using the repository mapping
 */
export async function fetchGameSourceFile(
  game: string,
  filePath: string,
  rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<Result<FetchResult, string>> {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) {
    return err("Unknown game: ${game}");
  }

  for (const path of normalizeCandidatePaths(repo.sourcePath, filePath)) {
    const fetchResult = await fetchGitHubFile(
      repo.owner,
      repo.repo,
      repo.branch,
      path,
      rateLimitConfig,
    );
    if (fetchResult.isOk()) return fetchResult;
  }

  return err("File not found: ${filePath}");
}

/**
 * Get specific lines from a GitHub file
 */
export async function fetchFileLines(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  startLine: number,
  endLine: number,
  rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<Result<string[], string>> {
  const result = await fetchGitHubFile(
    owner,
    repo,
    branch,
    path,
    rateLimitConfig,
  );

  if (result.isErr()) {
    return err(result.error);
  }

  const { lines, totalLines } = result.value;
  return extractLines(lines, totalLines, startLine, endLine);
}

/**
 * Utility function for delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a URL for viewing a file on GitHub
 */
export function createGitHubViewUrl(
  repo: GameRepository,
  filePath: string,
  lineNumber?: number,
): string {
  const base = `https://github.com/${repo.owner}/${repo.repo}/blob/${repo.branch}/${repo.sourcePath}/${filePath}`;
  if (lineNumber !== undefined) {
    return `${base}#L${lineNumber}`;
  }
  return base;
}

export { GitHubFileCache } from "./githubFileCache";
