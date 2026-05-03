import { Game } from "@/data/globals/globals";

export interface PreviewSession {
  readonly gameType: Game;
  readonly started: boolean;
  readonly runToken: number;
}

export function advancePreviewSession(
  currentSession: PreviewSession,
  gameType: Game,
): PreviewSession {
  return {
    gameType,
    started: true,
    runToken:
      currentSession.gameType === gameType ? currentSession.runToken + 1 : 1,
  };
}
