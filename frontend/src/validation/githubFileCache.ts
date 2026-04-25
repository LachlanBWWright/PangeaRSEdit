import { err, ok, type Result } from "neverthrow";
import {
  DEFAULT_RATE_LIMIT,
  fetchGitHubFile,
  type FetchResult,
  type RateLimitConfig,
} from "./githubFetcher";
import { GAME_REPOSITORIES } from "./gameRepositories";

interface CacheEntry {
  content: string;
  fetchedAt: number;
}

function createFetchResult(content: string): FetchResult {
  const lines = content.split("\n");
  return { content, lines, totalLines: lines.length };
}

function createCacheEntry(result: FetchResult): CacheEntry {
  return { content: result.content, fetchedAt: Date.now() };
}

function normalizeCandidatePaths(
  sourcePath: string,
  filePath: string,
): string[] {
  const normalizedPath = filePath.replace(/^\/+/, "");
  const candidates = [
    `${sourcePath}/${normalizedPath}`,
    normalizedPath,
    normalizedPath.startsWith("Source/")
      ? `${sourcePath}/${normalizedPath.slice("Source/".length)}`
      : `Source/${normalizedPath}`,
  ].map((candidate) => candidate.replace(/\/{2,}/g, "/"));

  const unique = new Set<string>();
  return candidates.filter((candidate) => {
    if (unique.has(candidate)) return false;
    unique.add(candidate);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GitHubFileCache {
  private cache: Map<string, CacheEntry>;
  private rateLimitConfig: RateLimitConfig;
  private requestCount: number;
  private requestWindowStart: number;

  constructor(rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT) {
    this.cache = new Map();
    this.rateLimitConfig = rateLimitConfig;
    this.requestCount = 0;
    this.requestWindowStart = Date.now();
  }

  private getCacheKey(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): string {
    return `${owner}/${repo}/${branch}/${path}`;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60 * 1000;
    const elapsed = now - this.requestWindowStart;

    if (elapsed > windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    if (this.requestCount < this.rateLimitConfig.maxRequestsPerMinute) {
      this.requestCount += 1;
      return;
    }

    const waitTime = windowDuration - elapsed;
    if (waitTime > 0) {
      await delay(waitTime);
    }

    this.requestCount = 1;
    this.requestWindowStart = Date.now();
  }

  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<Result<FetchResult, string>> {
    const key = this.getCacheKey(owner, repo, branch, path);
    const cached = this.cache.get(key);

    if (cached) return ok(createFetchResult(cached.content));

    await this.checkRateLimit();
    const result = await fetchGitHubFile(
      owner,
      repo,
      branch,
      path,
      this.rateLimitConfig,
    );

    if (result.isOk()) {
      this.cache.set(key, createCacheEntry(result.value));
    }

    return result;
  }

  async getGameFile(
    game: string,
    filePath: string,
  ): Promise<Result<FetchResult, string>> {
    const repo = GAME_REPOSITORIES[game];
    if (!repo) return err("Unknown game: ${game}");

    const candidatePaths = normalizeCandidatePaths(repo.sourcePath, filePath);

    for (const path of candidatePaths) {
      const result = await this.getFile(
        repo.owner,
        repo.repo,
        repo.branch,
        path,
      );
      if (result.isOk()) return result;
    }

    return err("File not found: ${filePath}");
  }

  async getFileLines(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    startLine: number,
    endLine: number,
  ): Promise<Result<string[], string>> {
    const fileResult = await this.getFile(owner, repo, branch, path);
    if (fileResult.isErr()) return err(fileResult.error);

    const { lines, totalLines } = fileResult.value;
    return extractLines(lines, totalLines, startLine, endLine);
  }

  async getGameFileLines(
    game: string,
    filePath: string,
    startLine: number,
    endLine: number,
  ): Promise<Result<string[], string>> {
    const repo = GAME_REPOSITORIES[game];
    if (!repo) return err("Unknown game: ${game}");

    const fullPath = `${repo.sourcePath}/${filePath}`;
    return this.getFileLines(
      repo.owner,
      repo.repo,
      repo.branch,
      fullPath,
      startLine,
      endLine,
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; games: Set<string> } {
    const games = new Set<string>();

    for (const key of this.cache.keys()) {
      const parts = key.split("/");
      const repoName = parts[1];
      if (parts.length < 2 || repoName === undefined) continue;
      games.add(repoName);
    }

    return { size: this.cache.size, games };
  }

  isInCache(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): boolean {
    return this.cache.has(this.getCacheKey(owner, repo, branch, path));
  }
}
