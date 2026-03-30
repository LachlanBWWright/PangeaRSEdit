import { describe, expect, it } from "vitest";
import {
  extractAllCitations,
  extractCitations,
  getAllCitationCounts,
  getGamesWithItemParams,
} from "@/validation/citationExtractor";
import { getKnownGames } from "@/validation/gameRepositories";

describe("citation coverage", () => {
  it("tracks citations for every known game", () => {
    expect(getGamesWithItemParams().sort()).toEqual(getKnownGames().sort());
  });

  it("includes citations for every game with structured item params", () => {
    const counts = getAllCitationCounts();

    for (const game of getKnownGames()) {
      expect(counts).toHaveProperty(game);
      if (game === "mightymike") {
        expect(counts[game]).toBe(0);
      } else {
        expect(counts[game]).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the all-games citation list in sync with per-game extraction", () => {
    const allCitations = extractAllCitations();
    const perGameCitations = getKnownGames().flatMap((game) => extractCitations(game));

    expect(allCitations).toHaveLength(perGameCitations.length);
  });
});
