//Game-speficic global variables

import { atom } from "jotai";
import { ottoMaticSpecs } from "../../python/structSpecs/ottoMatic";
import { bugdom2Specs } from "../../python/structSpecs/bugdom2";
import { bugdomSpecs } from "@/python/structSpecs/bugdom";
import { billyFrontierSpecs } from "@/python/structSpecs/billyFrontier";
export enum Game {
  OTTO_MATIC,
  BUGDOM,
  BUGDOM_2,
  NANOSAUR,
  NANOSAUR_2,
  CRO_MAG,
  BILLY_FRONTIER,
}

export enum DataType {
  STANDARD, //.ter.rsrc / .ter file - Most games
  TRT_FILE, //.trt / .ter file - Nanosaur 1
  RSRC_FORK, //Bundled with resource fork - Bugdom 1
}

export enum TileImageFormat {
  LZSS_16_BIT, //Standard 16-bit colour with LZSS compression
  JPG, //Used in Nanosaur 2
}

export interface GlobalsInterface {
  GAME_NAME: string;
  GAME_TYPE: Game;
  DATA_TYPE: DataType;
  TILE_IMAGE_FORMAT: TileImageFormat;
  STRUCT_SPECS: string[];
  SUPERTILE_TEXMAP_SIZE: number; //Dimensions of each supertile texture - SUPERTILE_TEXMAP_SIZE in src code
  TILES_PER_SUPERTILE: number; //SUPERTILE_SIZE in src code
  TILE_INGAME_SIZE: number; //How many units each tile is - TERRAIN_POLYGON_SIZE in src code
  TILE_SIZE: number; //How many units each tile is - OREOMAP_TILE_SIZE in src code
  EMPTY_TILE_IDX: number; //The number that indicates that a tile is blank

  LIQD_NUBS: number;
  //RING_BUF_SIZE?
  //HAS_FENCES: boolean;
  //HAS_SPLINES: boolean;
}

export const OttoGlobals: GlobalsInterface = {
  GAME_NAME: "Otto Matic",
  GAME_TYPE: Game.OTTO_MATIC,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  EMPTY_TILE_IDX: 0,
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX!
export const BugdomGlobals: GlobalsInterface = {
  GAME_NAME: "Bugdom",
  GAME_TYPE: Game.BUGDOM,
  DATA_TYPE: DataType.RSRC_FORK,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: bugdomSpecs,
  SUPERTILE_TEXMAP_SIZE: 32, //Dimensions of each supertile texture (Note; Bugdom has per-tile texmaps - supertiles are made by combining 5x5 texmaps)
  TILES_PER_SUPERTILE: 5, //How many tiles are in a supertile
  EMPTY_TILE_IDX: 0, //TODO: Not checked
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 32, //How many units each tile is
  LIQD_NUBS: 100,
};

export const Bugdom2Globals: GlobalsInterface = {
  GAME_NAME: "Bugdom 2",
  GAME_TYPE: Game.BUGDOM_2,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  EMPTY_TILE_IDX: -1,
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: FIX NOT CHECKED
export const NanosaurGlobals: GlobalsInterface = {
  GAME_NAME: "Nanosaur",
  GAME_TYPE: Game.NANOSAUR,
  DATA_TYPE: DataType.TRT_FILE,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 32, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 5, //How many tiles are in a supertile
  EMPTY_TILE_IDX: 0, //TODO: Not checked
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 32, //How many units each tile is //TODO: Check its not 140/32
  LIQD_NUBS: 100, //Not applicable to Nanosaur - Water is just another item
};

//TODO: NOT CHECKED, FIX
export const Nanosaur2Globals: GlobalsInterface = {
  GAME_NAME: "Nanosaur 2",
  GAME_TYPE: Game.NANOSAUR_2,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.JPG,
  STRUCT_SPECS: bugdom2Specs,
  SUPERTILE_TEXMAP_SIZE: 256, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  EMPTY_TILE_IDX: -1, //TODO: Not checked
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX
export const CroMagGlobals: GlobalsInterface = {
  GAME_NAME: "Cro Mag",
  GAME_TYPE: Game.CRO_MAG,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  EMPTY_TILE_IDX: 0, //TODO: Not checked
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 16, //How many units each tile is
  LIQD_NUBS: 100,
};

//TODO: NOT CHECKED, FIX
export const BillyFrontierGlobals: GlobalsInterface = {
  GAME_NAME: "Billy Frontier",
  GAME_TYPE: Game.BILLY_FRONTIER,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: billyFrontierSpecs,
  SUPERTILE_TEXMAP_SIZE: 256, //Dimensions of each supertile texture
  TILES_PER_SUPERTILE: 8, //How many tiles are in a supertile
  EMPTY_TILE_IDX: -1, //TODO: Not checked
  TILE_INGAME_SIZE: 225.0,
  TILE_SIZE: 32, //How many units each tile is
  LIQD_NUBS: 100,
};

export const Globals = atom<GlobalsInterface>(OttoGlobals);
