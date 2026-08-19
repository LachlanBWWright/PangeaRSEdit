import { deriveMultiplayerMatchKind, type MultiplayerMatchKind } from "./modes";

export type MultiplayerMatchPhase =
  | "lobby"
  | "loading"
  | "countdown"
  | "active"
  | "results"
  | "teardown";

export interface MultiplayerHudModel {
  readonly showLapCounter: boolean;
  readonly showObjectiveScore: boolean;
  readonly showResults: boolean;
}

export interface MatchPhaseInput {
  readonly lobbyState: string | null;
  readonly uiState: string;
}

export function deriveMatchKind(mode: string): MultiplayerMatchKind {
  return deriveMultiplayerMatchKind(mode);
}

export function deriveDisplayedMatchPhase(
  input: MatchPhaseInput,
): MultiplayerMatchPhase {
  if (input.lobbyState === "match_ended" || input.lobbyState === "ended") {
    return "results";
  }
  if (
    input.lobbyState === "closed" ||
    input.lobbyState === "expired" ||
    input.uiState === "disconnected"
  ) {
    return "teardown";
  }
  if (input.uiState === "running") {
    return "active";
  }
  if (input.uiState === "waiting-for-host-start") {
    return "countdown";
  }
  if (
    input.uiState === "loading-runtime" ||
    input.uiState === "waiting-for-peer-runtime" ||
    input.uiState === "connecting-peer"
  ) {
    return "loading";
  }
  return "lobby";
}

export function buildHudModel(
  kind: MultiplayerMatchKind,
  phase: MultiplayerMatchPhase,
): MultiplayerHudModel {
  return {
    showLapCounter: kind === "race" && phase !== "results",
    showObjectiveScore:
      (kind === "tag" ||
        kind === "survival" ||
        kind === "battle" ||
        kind === "capture-the-flag") &&
      phase !== "results",
    showResults: phase === "results",
  };
}
