//Game-speficic global variables

import { atom } from "jotai";
import { ottoMaticSpecs } from "../../python/structSpecs/ottoMatic";
import { bugdom2Specs } from "../../python/structSpecs/bugdom2";
export enum Game {
  OTTO_MATIC,
  BUGDOM,
  BUGDOM_2,
  NANOSAUR,
  NANOSAUR_2,
  CRO_MAG,
  BILLY_FRONTIER,
}

export enum TileDataTYpe {
  STANDARD, //.ter file - Most games
  TRT_FILE, //.trt file - Nanosaur 1
  RSRC_FORK, //Bundled with resource fork - Bugdom 1
}
/* 
export const OTTO_SUPERTILE_TEXMAP_SIZE = 128; //128x128 pixels
//SUPERTILE_SIZE from Otto source code
export const OTTO_SUPERTILE_SIZE = 8; //e.g. 1 supertile is 8x8 tiles
//OREMAP_FILE_SIZE from Otto source code (1 tile is 16 units wide)
export const OTTO_TILE_SIZE = 16;
export const OTTO_LIQD_NUBS = 100;
*/

export interface GlobalsInterface {
  GAME_NAME: string;
  GAME_TYPE: Game;
  STRUCT_SPECS: string[];
  SUPERTILE_TEXMAP_SIZE: number; //Dimensions of each supertile texture - SUPERTILE_TEXMAP_SIZE in src code
  TILES_PER_SUPERTILE: number; //SUPERTILE_SIZE in src code
  TILE_SIZE: number; //How many units each tile is - OREOMAP_TILE_SIZE in src code

  LIQD_NUBS: number;
  //RING_BUF_SIZE?
  //HAS_FENCES: boolean;
  //HAS_SPLINES: boolean;
}

export const OttoGlobals: GlobalsInterface = {
  GAME_NAME: "Otto Matic",
  GAME_TYPE: Game.OTTO_MATIC,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX!
export const BugdomGlobals: GlobalsInterface = {
  GAME_NAME: "Bugdom",
  GAME_TYPE: Game.BUGDOM,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

export const Bugdom2Globals: GlobalsInterface = {
  GAME_NAME: "Bugdom 2",
  GAME_TYPE: Game.BUGDOM_2,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: FIX NOT CHECKED
export const NanosaurGlobals: GlobalsInterface = {
  GAME_NAME: "Nanosaur",
  GAME_TYPE: Game.NANOSAUR,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX
export const Nanosaur2Globals: GlobalsInterface = {
  GAME_NAME: "Nanosaur 2",
  GAME_TYPE: Game.NANOSAUR_2,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 256, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX
export const CroMagGlobals: GlobalsInterface = {
  GAME_NAME: "Cro Mag",
  GAME_TYPE: Game.CRO_MAG,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX
export const BillyFrontierGlobals: GlobalsInterface = {
  GAME_NAME: "Billy Frontier",
  GAME_TYPE: Game.BILLY_FRONTIER,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  TILE_SIZE: 32, //How many units each tile is
  LIQD_NUBS: 100,
};

export const Globals = atom<GlobalsInterface>(OttoGlobals);
