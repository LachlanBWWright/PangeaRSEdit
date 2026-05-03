import { describe, it, expect } from "vitest";
import {
  extractCitations,
  extractAllCitations,
  getGamesWithItemParams,
  getCitationCount,
  getAllMissingCitations,
} from "./citationExtractor";
import {
  getKnownGames,
  hasKnownRepository,
  getGitHubRawUrl,
  getGitHubPermalink,
} from "./gameRepositories";

describe("Citation Extractor", () => {
  describe("extractCitations", () => {
    it("should return empty array for unknown game", () => {
      const citations = extractCitations("nonexistent-game");
      expect(citations).toEqual([]);
    });

    it("should extract citations for otto matic", () => {
      const citations = extractCitations("ottomatic");
      expect(citations.length).toBeGreaterThan(0);

      // Check structure of first citation
      const first = citations[0];
      expect(first).toHaveProperty("game", "ottomatic");
      expect(first).toHaveProperty("itemType");
      expect(first).toHaveProperty("parameterName");
      expect(first).toHaveProperty("citation");
      expect(first).toHaveProperty("sourceFile");
    });

    it("should extract citations from all games", () => {
      const allCitations = extractAllCitations();
      expect(allCitations.length).toBeGreaterThan(0);

      // Check that we have citations from multiple games
      const games = new Set(allCitations.map((c) => c.game));
      expect(games.size).toBeGreaterThan(1);
      expect(games.has("mightymike")).toBe(true);
    });

    it("should use path-qualified filenames for all extracted citations", () => {
      const allCitations = extractAllCitations();
      expect(
        allCitations.every((citation) =>
          citation.citation.fileName.includes("/"),
        ),
      ).toBe(true);
      expect(
        allCitations.every((citation) =>
          citation.citation.url.startsWith("https://github.com/"),
        ),
      ).toBe(true);
      expect(
        allCitations.every((citation) => citation.citation.lineNumber > 0),
      ).toBe(true);
    });
  });

  describe("getGamesWithItemParams", () => {
    it("should return list of games with item params", () => {
      const games = getGamesWithItemParams();
      expect(games).toContain("ottomatic");
      expect(games).toContain("bugdom2");
      expect(games).toContain("mightymike");
      expect(games.length).toBe(8);
    });
  });

  describe("getCitationCount", () => {
    it("should return count for known game", () => {
      const count = getCitationCount("ottomatic");
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 for unknown game", () => {
      const count = getCitationCount("nonexistent");
      expect(count).toBe(0);
    });
  });

  describe("missing citation coverage", () => {
    it("should not have missing citations for parameter descriptions", () => {
      const missing = getAllMissingCitations();
      expect(missing).toEqual([]);
    });

    it("should report no missing citations for each game with item params", () => {
      const missingByGame = getGamesWithItemParams().map((game) =>
        getAllMissingCitations().filter((item) => item.game === game),
      );
      expect(
        missingByGame.every((missingForGame) => missingForGame.length === 0),
      ).toBe(true);
    });
  });
});

describe("Game Repositories", () => {
  describe("getKnownGames", () => {
    it("should return list of known games", () => {
      const games = getKnownGames();
      expect(games).toContain("ottomatic");
      expect(games).toContain("bugdom");
      expect(games).toContain("nanosaur");
    });
  });

  describe("hasKnownRepository", () => {
    it("should return true for known games", () => {
      expect(hasKnownRepository("ottomatic")).toBe(true);
      expect(hasKnownRepository("bugdom")).toBe(true);
    });

    it("should return false for unknown games", () => {
      expect(hasKnownRepository("nonexistent")).toBe(false);
    });
  });

  describe("getGitHubRawUrl", () => {
    it("should construct correct raw URL", () => {
      const url = getGitHubRawUrl("ottomatic", "Items/Items.c");
      expect(url).toBe(
        "https://raw.githubusercontent.com/jorio/OttoMatic/master/src/Items/Items.c",
      );
    });

    it("should return null for unknown game", () => {
      const url = getGitHubRawUrl("nonexistent", "file.c");
      expect(url).toBeNull();
    });
  });

  describe("getGitHubPermalink", () => {
    it("should construct correct permalink URL", () => {
      const url = getGitHubPermalink("ottomatic", "Items/Items.c", 100);
      expect(url).toBe(
        "https://github.com/jorio/OttoMatic/blob/master/src/Items/Items.c#L100",
      );
    });

    it("should return null for unknown game", () => {
      const url = getGitHubPermalink("nonexistent", "file.c", 100);
      expect(url).toBeNull();
    });
  });
});
