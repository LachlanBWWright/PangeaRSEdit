import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

export const multiplayerGameIdSchema = z.enum(["cromagrally", "nanosaur2"]);
export const croMagMultiplayerModeSchema = z.enum([
  "multiplayerRace",
  "multiplayerTag1",
  "multiplayerTag2",
  "multiplayerSurvival",
  "multiplayerQuestForFire",
]);
export const nanosaur2MultiplayerModeSchema = z.enum([
  "multiplayerRace",
  "multiplayerBattle",
  "multiplayerFlag",
]);

export type MultiplayerGameId = z.infer<typeof multiplayerGameIdSchema>;
export type CroMagMultiplayerMode = z.infer<typeof croMagMultiplayerModeSchema>;
export type Nanosaur2MultiplayerMode = z.infer<
  typeof nanosaur2MultiplayerModeSchema
>;
export type MultiplayerLobbyMode =
  | CroMagMultiplayerMode
  | Nanosaur2MultiplayerMode;
export type LobbyModeFilterValue = "race" | "battle" | "capture-the-flag";
export type MultiplayerMatchKind =
  | "race"
  | "tag"
  | "survival"
  | "battle"
  | "capture-the-flag";

interface MultiplayerModeInfo {
  readonly label: string;
  readonly matchKind: MultiplayerMatchKind;
  readonly joinFilter: LobbyModeFilterValue;
}

interface CroMagModeInfo extends MultiplayerModeInfo {
  readonly usesBattleArenas: boolean;
}

interface Nanosaur2ModeInfo extends MultiplayerModeInfo {
  readonly usesRaceLevels: boolean;
}

const croMagModeInfoByMode: Record<CroMagMultiplayerMode, CroMagModeInfo> = {
  multiplayerRace: {
    label: "Race",
    matchKind: "race",
    joinFilter: "race",
    usesBattleArenas: false,
  },
  multiplayerTag1: {
    label: "Tag: Keep Away",
    matchKind: "tag",
    joinFilter: "battle",
    usesBattleArenas: true,
  },
  multiplayerTag2: {
    label: "Tag: Stampede",
    matchKind: "tag",
    joinFilter: "battle",
    usesBattleArenas: true,
  },
  multiplayerSurvival: {
    label: "Survival",
    matchKind: "survival",
    joinFilter: "battle",
    usesBattleArenas: true,
  },
  multiplayerQuestForFire: {
    label: "Quest for Fire",
    matchKind: "capture-the-flag",
    joinFilter: "capture-the-flag",
    usesBattleArenas: true,
  },
};

const nanosaur2ModeInfoByMode: Record<
  Nanosaur2MultiplayerMode,
  Nanosaur2ModeInfo
> = {
  multiplayerRace: {
    label: "Race",
    matchKind: "race",
    joinFilter: "race",
    usesRaceLevels: true,
  },
  multiplayerBattle: {
    label: "Battle",
    matchKind: "battle",
    joinFilter: "battle",
    usesRaceLevels: false,
  },
  multiplayerFlag: {
    label: "Capture the Flag",
    matchKind: "capture-the-flag",
    joinFilter: "capture-the-flag",
    usesRaceLevels: false,
  },
};

export const CRO_MAG_MULTIPLAYER_MODES = croMagMultiplayerModeSchema.options;
export const NANOSAUR2_MULTIPLAYER_MODES =
  nanosaur2MultiplayerModeSchema.options;

export function getCroMagModeInfo(mode: string): CroMagModeInfo | null {
  const parsedMode = croMagMultiplayerModeSchema.safeParse(mode);
  if (!parsedMode.success) {
    return null;
  }

  return croMagModeInfoByMode[parsedMode.data];
}

export function getNanosaur2ModeInfo(mode: string): Nanosaur2ModeInfo | null {
  const parsedMode = nanosaur2MultiplayerModeSchema.safeParse(mode);
  if (!parsedMode.success) {
    return null;
  }

  return nanosaur2ModeInfoByMode[parsedMode.data];
}

export function formatMultiplayerModeLabel(mode: string): string {
  return (
    getCroMagModeInfo(mode)?.label ??
    getNanosaur2ModeInfo(mode)?.label ??
    mode
  );
}

export function deriveLobbyModeFilterValue(mode: string): LobbyModeFilterValue {
  return (
    getCroMagModeInfo(mode)?.joinFilter ??
    getNanosaur2ModeInfo(mode)?.joinFilter ??
    "race"
  );
}

export function deriveMultiplayerMatchKind(mode: string): MultiplayerMatchKind {
  return (
    getCroMagModeInfo(mode)?.matchKind ??
    getNanosaur2ModeInfo(mode)?.matchKind ??
    "race"
  );
}

export function usesCroMagBattleArenas(mode: string): boolean {
  return getCroMagModeInfo(mode)?.usesBattleArenas ?? false;
}

export function usesNanosaur2RaceLevels(mode: string): boolean {
  return getNanosaur2ModeInfo(mode)?.usesRaceLevels ?? true;
}

function validateMatchModeForGame(
  gameId: MultiplayerGameId,
  mode: string,
): Result<MultiplayerLobbyMode, string> {
  if (gameId === "cromagrally") {
    const parsedMode = croMagMultiplayerModeSchema.safeParse(mode);
    if (!parsedMode.success) {
      return err(`Invalid Cro-Mag Rally multiplayer mode: ${mode}`);
    }
    return ok(parsedMode.data);
  }

  const parsedMode = nanosaur2MultiplayerModeSchema.safeParse(mode);
  if (!parsedMode.success) {
    return err(`Invalid Nanosaur 2 multiplayer mode: ${mode}`);
  }
  return ok(parsedMode.data);
}

export function validateMultiplayerGameMode(
  gameId: string,
  mode: string,
): Result<MultiplayerLobbyMode, string> {
  const parsedGameId = multiplayerGameIdSchema.safeParse(gameId);
  if (!parsedGameId.success) {
    return err(`Unsupported multiplayer game: ${gameId}`);
  }

  return validateMatchModeForGame(parsedGameId.data, mode);
}
