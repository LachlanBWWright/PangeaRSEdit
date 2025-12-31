/**
 * Test fixture paths for map roundtrip tests
 * These reference the actual game data files in the games folder
 */

import path from "path";

// Base path to the games folder
const GAMES_BASE_PATH = path.resolve(__dirname, "../../../games");

export const FIXTURE_PATHS = {
  ottomatic: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "ottomatic/Data/Terrain/EarthFarm.ter.rsrc",
    ),
    terrainTer: path.join(
      GAMES_BASE_PATH,
      "ottomatic/Data/Terrain/EarthFarm.ter",
    ),
    name: "EarthFarm",
  },
  bugdom: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "bugdom/Data/Terrain/Lawn.ter.rsrc",
    ),
    terrainTer: null, // Bugdom 1 has terrain data in the rsrc file
    name: "Lawn",
  },
  bugdom2: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "bugdom2/Data/Terrain/Level1_Garden.ter.rsrc",
    ),
    terrainTer: path.join(
      GAMES_BASE_PATH,
      "bugdom2/Data/Terrain/Level1_Garden.ter",
    ),
    name: "Level1_Garden",
  },
  cromagrally: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "cromagrally/Data/Terrain/StoneAge_Jungle.ter.rsrc",
    ),
    terrainTer: path.join(
      GAMES_BASE_PATH,
      "cromagrally/Data/Terrain/StoneAge_Jungle.ter",
    ),
    name: "StoneAge_Jungle",
  },
  nanosaur: {
    terrainTer: path.join(GAMES_BASE_PATH, "nanosaur/Data/Terrain/Level1.ter"),
    terrainTrt: path.join(GAMES_BASE_PATH, "nanosaur/Data/Terrain/Level1.trt"),
    name: "Level1",
  },
  nanosaur2: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "nanosaur2/Data/Terrain/level1.ter.rsrc",
    ),
    terrainTer: path.join(GAMES_BASE_PATH, "nanosaur2/Data/Terrain/level1.ter"),
    name: "level1",
  },
  billyfrontier: {
    terrainRsrc: path.join(
      GAMES_BASE_PATH,
      "billyfrontier/Data/Terrain/town_duel.ter.rsrc",
    ),
    terrainTer: path.join(
      GAMES_BASE_PATH,
      "billyfrontier/Data/Terrain/town_duel.ter",
    ),
    name: "town_duel",
  },
};

export type GameName = keyof typeof FIXTURE_PATHS;
