//Game-speficic global variables

import { atom } from "jotai";
import { ottoMaticSpecs } from "../../python/structSpecs/ottoMatic";
import { bugdom2Specs } from "../../python/structSpecs/bugdom2";
import { bugdomSpecs } from "../../python/structSpecs/bugdom";
import { billyFrontierSpecs } from "../../python/structSpecs/billyFrontier";
import { croMagSpecs } from "../../python/structSpecs/croMag";
import { nanosaur2Specs } from "../../python/structSpecs/nanosaur2";
import { mightyMikeSpecs } from "../../python/structSpecs/mightyMike";
export enum Game {
  OTTO_MATIC,
  BUGDOM,
  BUGDOM_2,
  NANOSAUR,
  NANOSAUR_2,
  CRO_MAG,
  BILLY_FRONTIER,
  MIGHTY_MIKE,
}

export enum DataType {
  STANDARD, //.ter.rsrc / .ter file - Most games
  TRT_FILE, //.trt / .ter file - Nanosaur 1
  RSRC_FORK, //Bundled with resource fork - Bugdom 1
  MIGHTY_MIKE, // .tileset / .map files - MightyMike
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

// Bugdom 1 uses individual 32x32 tiles that are combined into supertiles at runtime
// Unlike other games which have pre-composed supertile textures
// Supertiles are 5x5 tiles = 160x160 pixels
export const BugdomGlobals: GlobalsInterface = {
  GAME_NAME: "Bugdom",
  GAME_TYPE: Game.BUGDOM,
  DATA_TYPE: DataType.RSRC_FORK,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: bugdomSpecs,
  SUPERTILE_TEXMAP_SIZE: 160, // Composed supertile size (5 tiles * 32 pixels = 160)
  TILES_PER_SUPERTILE: 5, // How many tiles are in a supertile (5x5)
  EMPTY_TILE_IDX: 0,
  TILE_INGAME_SIZE: 160.0, // TERRAIN_POLYGON_SIZE from Bugdom source (160 world units per supertile)
  TILE_SIZE: 32, // OREOMAP_TILE_SIZE - pixel size of each individual tile texture
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

//Nanosaur 1 uses individual 32x32 tiles composed into 5x5 supertiles (like Bugdom 1)
export const NanosaurGlobals: GlobalsInterface = {
  GAME_NAME: "Nanosaur",
  GAME_TYPE: Game.NANOSAUR,
  DATA_TYPE: DataType.TRT_FILE,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: ottoMaticSpecs,
  SUPERTILE_TEXMAP_SIZE: 160, // 5 tiles * 32 pixels = 160 (same as Bugdom)
  TILES_PER_SUPERTILE: 5, // SUPERTILE_SIZE in source (5x5 tiles per supertile)
  EMPTY_TILE_IDX: 0,
  TILE_INGAME_SIZE: 140.0, // TERRAIN_POLYGON_SIZE from Nanosaur source
  TILE_SIZE: 32, // OREOMAP_TILE_SIZE - 32x32 pixel tiles
  LIQD_NUBS: 100, // Not applicable to Nanosaur - Water is just another item
};

// Nanosaur 2 uses 256x256 supertile textures (JPG format)
// Source: games/nanosaur2/Source/Headers/terrain.h - DEFAULT_TERRAIN_SCALE = 210
export const Nanosaur2Globals: GlobalsInterface = {
  GAME_NAME: "Nanosaur 2",
  GAME_TYPE: Game.NANOSAUR_2,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.JPG,
  STRUCT_SPECS: nanosaur2Specs,
  SUPERTILE_TEXMAP_SIZE: 256, // SUPERTILE_TEXMAP_SIZE from terrain.h
  TILES_PER_SUPERTILE: 8, // SUPERTILE_SIZE from terrain.h
  EMPTY_TILE_IDX: 0, // Uses isEmpty flag like Otto Matic
  TILE_INGAME_SIZE: 210.0, // DEFAULT_TERRAIN_SCALE from terrain.h
  TILE_SIZE: 32, // OREOMAP_TILE_SIZE = SUPERTILE_TEXMAP_SIZE/SUPERTILE_SIZE = 256/8 = 32
  LIQD_NUBS: 100,
};

// Cro-Mag Rally uses similar format to Otto Matic but with numPaths instead of numWaterPatches
// Source: games/cromagrally/Source/Headers/terrain.h
export const CroMagGlobals: GlobalsInterface = {
  GAME_NAME: "Cro-Mag Rally",
  GAME_TYPE: Game.CRO_MAG,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: croMagSpecs,
  SUPERTILE_TEXMAP_SIZE: 128, // SUPERTILE_TEXMAP_SIZE from terrain.h
  TILES_PER_SUPERTILE: 8, // SUPERTILE_SIZE from terrain.h
  EMPTY_TILE_IDX: 0,
  TILE_INGAME_SIZE: 800.0, // TERRAIN_POLYGON_SIZE from terrain.h
  TILE_SIZE: 16, // OREOMAP_TILE_SIZE from terrain.h
  LIQD_NUBS: 100,
};

// Billy Frontier uses 256x256 supertile textures
// Source: games/billyfrontier/Source/Headers/terrain.h - DEFAULT_TERRAIN_SCALE = 125
export const BillyFrontierGlobals: GlobalsInterface = {
  GAME_NAME: "Billy Frontier",
  GAME_TYPE: Game.BILLY_FRONTIER,
  DATA_TYPE: DataType.STANDARD,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: billyFrontierSpecs,
  SUPERTILE_TEXMAP_SIZE: 256, // SUPERTILE_TEXMAP_SIZE from terrain.h
  TILES_PER_SUPERTILE: 8, // SUPERTILE_SIZE from terrain.h
  EMPTY_TILE_IDX: -1, // Uses signed short, -1 = empty
  TILE_INGAME_SIZE: 125.0, // DEFAULT_TERRAIN_SCALE from terrain.h
  TILE_SIZE: 32, // OREOMAP_TILE_SIZE = SUPERTILE_TEXMAP_SIZE/SUPERTILE_SIZE = 256/8 = 32
  LIQD_NUBS: 100,
};

// MightyMike uses 2D tilemaps instead of 3D terrain
// Files: .tileset (tile definitions) and .map (2D tile arrays + items)
export const MightyMikeGlobals: GlobalsInterface = {
  GAME_NAME: "Mighty Mike",
  GAME_TYPE: Game.MIGHTY_MIKE,
  DATA_TYPE: DataType.MIGHTY_MIKE,
  TILE_IMAGE_FORMAT: TileImageFormat.LZSS_16_BIT,
  STRUCT_SPECS: mightyMikeSpecs, // Not used for actual parsing - uses TypeScript parser
  SUPERTILE_TEXMAP_SIZE: 32, // Individual tile size (32x32 pixels)
  TILES_PER_SUPERTILE: 1, // No supertiles - direct tile mapping
  EMPTY_TILE_IDX: 0,
  TILE_INGAME_SIZE: 32.0, // Each tile is 32 units
  TILE_SIZE: 32, // Tile pixel size
  LIQD_NUBS: 100,
};

export const Globals = atom<GlobalsInterface>(OttoGlobals);
