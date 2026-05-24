import { describe, expect, it } from "vitest";
import {
  buildHudModel,
  deriveDisplayedMatchPhase,
  deriveMatchKind,
} from "@/multiplayer/matchState";

describe("multiplayer match state", () => {
  it("maps modes to explicit match kinds", () => {
    expect(deriveMatchKind("multiplayerRace")).toBe("race");
    expect(deriveMatchKind("multiplayerBattle")).toBe("battle");
    expect(deriveMatchKind("multiplayerTag1")).toBe("tag");
    expect(deriveMatchKind("multiplayerSurvival")).toBe("survival");
    expect(deriveMatchKind("multiplayerQuestForFire")).toBe(
      "capture-the-flag",
    );
    expect(deriveMatchKind("multiplayerFlag")).toBe("capture-the-flag");
  });

  it("derives explicit lifecycle phases from lobby and ui state", () => {
    expect(
      deriveDisplayedMatchPhase({
        lobbyState: "open",
        uiState: "idle",
      }),
    ).toBe("lobby");
    expect(
      deriveDisplayedMatchPhase({
        lobbyState: "started",
        uiState: "loading-runtime",
      }),
    ).toBe("loading");
    expect(
      deriveDisplayedMatchPhase({
        lobbyState: "started",
        uiState: "waiting-for-host-start",
      }),
    ).toBe("countdown");
    expect(
      deriveDisplayedMatchPhase({
        lobbyState: "started",
        uiState: "running",
      }),
    ).toBe("active");
    expect(
      deriveDisplayedMatchPhase({
        lobbyState: "ended",
        uiState: "running",
      }),
    ).toBe("results");
  });

  it("gates HUD affordances from match kind and phase", () => {
    expect(buildHudModel("race", "active")).toEqual({
      showLapCounter: true,
      showObjectiveScore: false,
      showResults: false,
    });
    expect(buildHudModel("battle", "active")).toEqual({
      showLapCounter: false,
      showObjectiveScore: true,
      showResults: false,
    });
    expect(buildHudModel("tag", "active")).toEqual({
      showLapCounter: false,
      showObjectiveScore: true,
      showResults: false,
    });
    expect(buildHudModel("capture-the-flag", "results")).toEqual({
      showLapCounter: false,
      showObjectiveScore: false,
      showResults: true,
    });
  });
});
