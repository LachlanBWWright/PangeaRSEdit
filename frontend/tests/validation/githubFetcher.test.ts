/**
 * Tests for GitHub Content Fetcher
 */

import { describe, it, expect, beforeEach } from "vitest";
import { 
  GitHubFileCache, 
  DEFAULT_RATE_LIMIT,
} from "../../src/validation/githubFetcher";

describe("GitHubFileCache", () => {
  let cache: GitHubFileCache;
  
  beforeEach(() => {
    cache = new GitHubFileCache(DEFAULT_RATE_LIMIT);
  });
  
  describe("getCacheStats", () => {
    it("should return empty stats for new cache", () => {
      const stats = cache.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.games.size).toBe(0);
    });
  });
  
  describe("isInCache", () => {
    it("should return false for non-cached files", () => {
      expect(cache.isInCache("owner", "repo", "main", "path/file.c")).toBe(false);
    });
  });
  
  describe("clearCache", () => {
    it("should clear the cache", () => {
      cache.clearCache();
      const stats = cache.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
