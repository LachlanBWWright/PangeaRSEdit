import level1hardRsrc from "./levelFiles/level1Hard/EarthFarm.ter.rsrc?url";
import { Game } from "./globals/globals";
import { GAME_PORT_CONFIGS } from "@/editor/utils/gamePortConfig";

export interface Level {
  id: string;
  name: string;
  game: string;
  gameDisplayName: string;
  summary: string;
  description: string;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  terFile?: string;
  rsrcFile?: string;
  /** The level index to launch in the game preview for this custom level */
  previewLevelNumber?: number;
}

/** Maps the string game key used in Level records to the Game enum */
export const GAME_KEY_TO_ENUM: Record<string, Game> = {
  billyFrontier: Game.BILLY_FRONTIER,
  bugdom: Game.BUGDOM,
  bugdom2: Game.BUGDOM_2,
  croMag: Game.CRO_MAG,
  mightyMike: Game.MIGHTY_MIKE,
  nanosaur: Game.NANOSAUR,
  nanosaur2: Game.NANOSAUR_2,
  ottoMatic: Game.OTTO_MATIC,
};

export const levelsData: Level[] = [
  // Otto Matic
  {
    id: "otto-farm",
    name: "Level 1 Hard",
    game: "ottoMatic",
    gameDisplayName: "Otto Matic",
    category: "Level 1",
    summary: "A harder version of Level 1's first level.",
    description: "Farms have tractors, right?",
    rsrcFile: level1hardRsrc,
    previewLevelNumber: 0,
  },
];

export const getGameDisplayName = (game: string): string => {
  const gameMap: Record<string, string> = {
    billyFrontier: "Billy Frontier",
    bugdom: "Bugdom",
    bugdom2: "Bugdom 2",
    croMag: "Cro-Mag Rally",
    mightyMike: "Mighty Mike",
    nanosaur: "Nanosaur",
    nanosaur2: "Nanosaur 2",
    ottoMatic: "Otto Matic",
  };
  return gameMap[game] || game;
};

export const getGamesByCategory = () => {
  const games = Array.from(new Set(levelsData.map((level) => level.game)));
  return games.map((game) => ({
    id: game,
    name: getGameDisplayName(game),
    levels: levelsData.filter((level) => level.game === game),
  }));
};

/** Ordered list of all 8 games for the launcher section */
export const ALL_GAME_CONFIGS = Object.values(GAME_PORT_CONFIGS);
