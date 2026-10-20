import { Game, OttoGlobals, BugdomGlobals, Bugdom2Globals, NanosaurGlobals,
  Nanosaur2Globals, CroMagGlobals, BillyFrontierGlobals, MightyMikeGlobals,
  type GlobalsInterface } from "@/data/globals/globals";
import type { GameId } from "@pangea/desktop-contracts";

export const DESKTOP_GAMES: readonly { id: GameId; label: string; globals: GlobalsInterface }[] = [
  { id: "OttoMatic", label: "Otto Matic", globals: OttoGlobals },
  { id: "Bugdom", label: "Bugdom", globals: BugdomGlobals },
  { id: "Bugdom2", label: "Bugdom 2", globals: Bugdom2Globals },
  { id: "Nanosaur", label: "Nanosaur", globals: NanosaurGlobals },
  { id: "Nanosaur2", label: "Nanosaur 2", globals: Nanosaur2Globals },
  { id: "CroMagRally", label: "Cro-Mag Rally", globals: CroMagGlobals },
  { id: "BillyFrontier", label: "Billy Frontier", globals: BillyFrontierGlobals },
  { id: "MightyMike", label: "Mighty Mike", globals: MightyMikeGlobals },
];
export function desktopGameId(game: Game): GameId {
  return DESKTOP_GAMES.find((entry) => entry.globals.GAME_TYPE === game)?.id ?? "OttoMatic";
}
