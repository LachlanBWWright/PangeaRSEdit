/**
 * GitHub Content Fetcher
 * 
 * Fetches source code from GitHub repositories for citation verification.
 * Includes caching to avoid rate limiting and retry logic for reliability.
 */

import { Result, ok, err, fromPromise } from "../types/result";
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

/**
 * Fetch a file from a GitHub repository
 */
export async function fetchGitHubFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<Result<FetchResult, Error>> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < rateLimitConfig.maxRetries; attempt++) {
    if (attempt > 0) {
      // Wait before retry with exponential backoff
      await delay(rateLimitConfig.retryDelay * Math.pow(2, attempt - 1));
    }

    const fetchResult = await fromPromise(fetch(url));
    if (!fetchResult.ok) {
      lastError = fetchResult.error;
      continue;
    }

    const response = fetchResult.value;

    if (!response.ok) {
      if (response.status === 404) {
        return err(new Error(`File not found: ${path}`));
      }
      if (response.status === 403) {
        // Rate limited - wait longer
        await delay(rateLimitConfig.retryDelay * 10);
        continue;
      }
      return err(new Error(`HTTP ${response.status}: ${response.statusText}`));
    }

    const textResult = await fromPromise(response.text());
    if (!textResult.ok) {
      lastError = textResult.error;
      continue;
    }

    const content = textResult.value;
    const lines = content.split('\n');

    return ok({
      content,
      lines,
      totalLines: lines.length,
    });
  }

  return err(lastError ?? new Error('Unknown fetch error'));
}

/**
 * Fetch a game source file using the repository mapping
 */
export async function fetchGameSourceFile(
  game: string,
  filePath: string,
  rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT,
): Promise<Result<FetchResult, Error>> {
  const repo = GAME_REPOSITORIES[game];
  if (!repo) {
    return err(new Error(`Unknown game: ${game}`));
  }
  
  // The filePath from citations is like "Items/Items.c"
  // We need to prepend the source path
  const fullPath = `${repo.sourcePath}/${filePath}`;
  
  return fetchGitHubFile(repo.owner, repo.repo, repo.branch, fullPath, rateLimitConfig);
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
): Promise<Result<string[], Error>> {
  const result = await fetchGitHubFile(owner, repo, branch, path, rateLimitConfig);
  
  if (!result.ok) {
    return result;
  }
  
  const { lines, totalLines } = result.value;
  
  // Validate line numbers (1-indexed)
  if (startLine < 1 || endLine < startLine) {
    return err(new Error(`Invalid line range: ${startLine}-${endLine}`));
  }
  
  if (startLine > totalLines) {
    return err(new Error(`Start line ${startLine} exceeds file length ${totalLines}`));
  }
  
  // Convert to 0-indexed and slice
  const actualEnd = Math.min(endLine, totalLines);
  const extractedLines = lines.slice(startLine - 1, actualEnd);
  
  return ok(extractedLines);
}

/**
 * Cache entry for a fetched file
 */
interface CacheEntry {
  content: string;
  lines: string[];
  totalLines: number;
  fetchedAt: number;
}

/**
 * Cache for fetched GitHub files to avoid rate limiting
 */
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
  
  /**
   * Generate cache key for a file
   */
  private getCacheKey(owner: string, repo: string, branch: string, path: string): string {
    return `${owner}/${repo}/${branch}/${path}`;
  }
  
  /**
   * Check and update rate limit
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute
    
    // Reset window if needed
    if (now - this.requestWindowStart > windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }
    
    // Wait if at limit
    if (this.requestCount >= this.rateLimitConfig.maxRequestsPerMinute) {
      const waitTime = windowDuration - (now - this.requestWindowStart);
      if (waitTime > 0) {
        await delay(waitTime);
        this.requestCount = 0;
        this.requestWindowStart = Date.now();
      }
    }
    
    this.requestCount++;
  }
  
  /**
   * Get a file from cache or fetch it
   */
  async getFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<Result<FetchResult, Error>> {
    const key = this.getCacheKey(owner, repo, branch, path);
    
    // Check cache
    const cached = this.cache.get(key);
    if (cached) {
      return ok({
        content: cached.content,
        lines: cached.lines,
        totalLines: cached.totalLines,
      });
    }
    
    // Rate limit check
    await this.checkRateLimit();
    
    // Fetch from GitHub
    const result = await fetchGitHubFile(owner, repo, branch, path, this.rateLimitConfig);
    
    if (result.ok) {
      // Cache the result
      this.cache.set(key, {
        content: result.value.content,
        lines: result.value.lines,
        totalLines: result.value.totalLines,
        fetchedAt: Date.now(),
      });
    }
    
    return result;
  }
  
  /**
   * Get a file for a specific game
   */
  async getGameFile(
    game: string,
    filePath: string,
  ): Promise<Result<FetchResult, Error>> {
    const repo = GAME_REPOSITORIES[game];
    if (!repo) {
      return err(new Error(`Unknown game: ${game}`));
    }
    
    const fullPath = `${repo.sourcePath}/${filePath}`;
    return this.getFile(repo.owner, repo.repo, repo.branch, fullPath);
  }
  
  /**
   * Get specific lines from a cached or fetched file
   */
  async getFileLines(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    startLine: number,
    endLine: number,
  ): Promise<Result<string[], Error>> {
    const fileResult = await this.getFile(owner, repo, branch, path);
    
    if (!fileResult.ok) {
      return fileResult;
    }
    
    const { lines, totalLines } = fileResult.value;
    
    // Validate line numbers (1-indexed)
    if (startLine < 1 || endLine < startLine) {
      return err(new Error(`Invalid line range: ${startLine}-${endLine}`));
    }
    
    if (startLine > totalLines) {
      return err(new Error(`Start line ${startLine} exceeds file length ${totalLines}`));
    }
    
    // Convert to 0-indexed and slice
    const actualEnd = Math.min(endLine, totalLines);
    const extractedLines = lines.slice(startLine - 1, actualEnd);
    
    return ok(extractedLines);
  }
  
  /**
   * Get lines from a game source file
   */
  async getGameFileLines(
    game: string,
    filePath: string,
    startLine: number,
    endLine: number,
  ): Promise<Result<string[], Error>> {
    const repo = GAME_REPOSITORIES[game];
    if (!repo) {
      return err(new Error(`Unknown game: ${game}`));
    }
    
    const fullPath = `${repo.sourcePath}/${filePath}`;
    return this.getFileLines(repo.owner, repo.repo, repo.branch, fullPath, startLine, endLine);
  }
  
  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; games: Set<string> } {
    const games = new Set<string>();
    
    for (const key of this.cache.keys()) {
      // Extract repo name from key
      const parts = key.split('/');
      const repoName = parts[1];
      if (parts.length >= 2 && repoName !== undefined) {
        games.add(repoName);
      }
    }
    
    return {
      size: this.cache.size,
      games,
    };
  }
  
  /**
   * Check if a file is in cache
   */
  isInCache(owner: string, repo: string, branch: string, path: string): boolean {
    return this.cache.has(this.getCacheKey(owner, repo, branch, path));
  }
}

/**
 * Utility function for delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
