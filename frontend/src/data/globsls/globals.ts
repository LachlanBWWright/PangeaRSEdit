//Game-speficic global variables

import { atom } from "jotai";

/* 
export const OTTO_SUPERTILE_TEXMAP_SIZE = 128; //128x128 pixels
//SUPERTILE_SIZE from Otto source code
export const OTTO_SUPERTILE_SIZE = 8; //e.g. 1 supertile is 8x8 tiles
//OREMAP_FILE_SIZE from Otto source code (1 tile is 16 units wide)
export const OTTO_TILE_SIZE = 16;
export const OTTO_LIQD_NUBS = 100;
*/

interface Globals {
  SUPERTILE_TEXMAP_SIZE: number; //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: number;
  TILE_SIZE: number; //How many units each tile is

  LIQD_NUBS: number;
  //RING_BUF_SIZE?
  //HAS_FENCES: boolean;
  //HAS_SPLINES: boolean;
}

const OttoGlobals: Globals = {
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

export const Globals = atom<Globals>(OttoGlobals);

enum Game {
  OTTO_MATIC,
}

export const SelectedGame = atom<Game>(Game.OTTO_MATIC);
