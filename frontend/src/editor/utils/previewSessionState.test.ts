import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  advancePreviewSession,
  type PreviewSession,
} from "./previewSessionState";

describe("advancePreviewSession", () => {
  it("increments the token when relaunching the same game", () => {
    const currentSession: PreviewSession = {
      gameType: Game.BUGDOM,
      started: true,
      runToken: 4,
    };

    expect(advancePreviewSession(currentSession, Game.BUGDOM)).toEqual({
      gameType: Game.BUGDOM,
      started: true,
      runToken: 5,
    });
  });

  it("resets the token when switching games", () => {
    const currentSession: PreviewSession = {
      gameType: Game.BUGDOM,
      started: true,
      runToken: 4,
    };

    expect(advancePreviewSession(currentSession, Game.OTTO_MATIC)).toEqual({
      gameType: Game.OTTO_MATIC,
      started: true,
      runToken: 1,
    });
  });
});
