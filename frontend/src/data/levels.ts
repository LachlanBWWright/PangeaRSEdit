import level1hardRsrc from "./levelFiles/level1Hard/EarthFarm.ter.rsrc?url";

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
}

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
  },
];

export const getGameDisplayName = (game: string): string => {
  const gameMap: Record<string, string> = {
    billyFrontier: "Billy Frontier",
    bugdom: "Bugdom",
    bugdom2: "Bugdom 2",
    croMag: "Cro-Mag Rally",
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
