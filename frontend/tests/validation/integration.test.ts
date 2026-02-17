/**
 * Integration tests for validation module consistency
 */

import { describe, it, expect } from "vitest";
import {
  GAME_REPOSITORIES,
  getGitHubRawUrl,
  getGitHubPermalink,
  hasKnownRepository,
  getKnownGames,
} from "@/validation/gameRepositories";

describe("Validation Module Integration", () => {
  describe("Game Repository Configuration", () => {
    it("all Pangea games have repository entries", () => {
      const knownGames = getKnownGames();
      
      // Should have all major Pangea games
      expect(knownGames).toContain("ottomatic");
      expect(knownGames).toContain("bugdom");
      expect(knownGames).toContain("bugdom2");
      expect(knownGames).toContain("nanosaur");
      expect(knownGames).toContain("nanosaur2");
      expect(knownGames).toContain("cromag");
      expect(knownGames).toContain("billyfrontier");
      expect(knownGames).toContain("mightymike");
    });

    it("repository entries have valid structure", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        expect(repo).toBeDefined();
        expect(typeof repo.owner).toBe("string");
        expect(typeof repo.repo).toBe("string");
        expect(typeof repo.branch).toBe("string");
        expect(typeof repo.sourcePath).toBe("string");
        expect(repo.owner.length).toBeGreaterThan(0);
        expect(repo.repo.length).toBeGreaterThan(0);
      }
    });

    it("hasKnownRepository returns correct values", () => {
      expect(hasKnownRepository("ottomatic")).toBe(true);
      expect(hasKnownRepository("bugdom")).toBe(true);
      expect(hasKnownRepository("unknown_game")).toBe(false);
      expect(hasKnownRepository("")).toBe(false);
    });
  });

  describe("URL Generation", () => {
    it("generates valid raw GitHub URLs", () => {
      const url = getGitHubRawUrl("ottomatic", "Items.c");
      
      expect(url).not.toBeNull();
      expect(url).toContain("raw.githubusercontent.com");
      expect(url).toContain("jorio");
      expect(url).toContain("OttoMatic");
      expect(url).toContain("Items.c");
    });

    it("generates valid permalink URLs", () => {
      const url = getGitHubPermalink("bugdom", "Enemies.c", 100);
      
      expect(url).not.toBeNull();
      expect(url).toContain("github.com");
      expect(url).toContain("jorio");
      expect(url).toContain("Bugdom");
      expect(url).toContain("#L100");
    });

    it("returns null for unknown games", () => {
      expect(getGitHubRawUrl("fake_game", "file.c")).toBeNull();
      expect(getGitHubPermalink("fake_game", "file.c", 1)).toBeNull();
    });
  });

  describe("Repository URL format consistency", () => {
    it("all repos use valid GitHub username format", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        // GitHub usernames: alphanumeric, hyphens, not starting/ending with hyphen
        expect(repo.owner).toMatch(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/);
      }
    });

    it("all repos use valid repository name format", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        // GitHub repo names: alphanumeric, dots, hyphens, underscores
        expect(repo.repo).toMatch(/^[a-zA-Z0-9._-]+$/);
      }
    });

    it("all repos use standard branch names", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        // Common branch names
        expect(["main", "master", "dev", "develop"]).toContain(repo.branch);
      }
    });
  });

  describe("Jorio repositories", () => {
    it("all games are under jorio organization", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        expect(repo.owner).toBe("jorio");
      }
    });

    it("jorio repos use src path for source", () => {
      for (const repo of Object.values(GAME_REPOSITORIES)) {
        expect(repo.sourcePath).toBe("src");
      }
    });
  });

  describe("Cross-module consistency", () => {
    it("game count matches expected", () => {
      const games = getKnownGames();
      
      // Should have exactly 8 games (the major Pangea titles)
      expect(games.length).toBe(8);
    });

    it("raw and permalink URLs use same base info", () => {
      for (const game of getKnownGames()) {
        const rawUrl = getGitHubRawUrl(game, "test.c");
        const permalink = getGitHubPermalink(game, "test.c", 1);
        
        // Both should reference the same repo
        const repo = GAME_REPOSITORIES[game];
        expect(repo).toBeDefined();
        if (!repo) continue;
        
        expect(rawUrl).toContain(repo.owner);
        expect(rawUrl).toContain(repo.repo);
        expect(permalink).toContain(repo.owner);
        expect(permalink).toContain(repo.repo);
      }
    });
  });
});
