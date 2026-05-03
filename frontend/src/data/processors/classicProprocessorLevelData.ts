import { LevelData } from "@/python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "./classicProprocessorTypes";

export function nanosaur1LevelToLevelData(
  level: Nanosaur1LevelData,
  tileSize = 32,
  tileIngameSize = 140,
  heightExtrudeFactor = 4.0,
): LevelData {
  const width = level.header.width;
  const depth = level.header.depth;
  const emptyRecord = {};

  const HMTILE_SIZE = 32;
  const HEIGHT_EXTRUDE_FACTOR = heightExtrudeFactor;
  const TERRAIN_POLYGON_SIZE = tileIngameSize;
  const OREOMAP_TILE_SIZE = tileSize;
  const HEIGHT_WORLD_TO_PIXEL =
    (OREOMAP_TILE_SIZE / TERRAIN_POLYGON_SIZE) * HEIGHT_EXTRUDE_FACTOR;

  const ycrdData: number[] = [];
  if (
    level.heightmapLayer &&
    level.heightmapTiles &&
    level.heightmapTiles.length > 0
  ) {
    for (let row = 0; row <= depth; row++) {
      for (let col = 0; col <= width; col++) {
        const tileRow = row === depth ? depth - 1 : row;
        const tileCol = col === width ? width - 1 : col;
        const tileIndex = tileRow * width + tileCol;
        const tileEntry = level.heightmapLayer[tileIndex];
        if (tileEntry === undefined || tileEntry === null) {
          ycrdData.push(0);
          continue;
        }

        const TILENUM_MASK = 0x0fff;
        const TILE_FLIPX_MASK = 1 << 15;
        const TILE_FLIPY_MASK = 1 << 14;

        const tileNum = tileEntry & TILENUM_MASK;
        const flipX = (tileEntry & TILE_FLIPX_MASK) !== 0;
        const flipY = (tileEntry & TILE_FLIPY_MASK) !== 0;

        let offx = col === width ? HMTILE_SIZE - 1 : 0;
        let offy = row === depth ? HMTILE_SIZE - 1 : 0;

        if (flipX) offx = HMTILE_SIZE - 1 - offx;
        if (flipY) offy = HMTILE_SIZE - 1 - offy;

        let heightVal = 0;
        if (
          tileNum >= 0 &&
          Array.isArray(level.heightmapTiles) &&
          tileNum < level.heightmapTiles.length
        ) {
          const tileArr = level.heightmapTiles[tileNum];
          if (tileArr && tileArr.length > 0) {
            const idx = offy * HMTILE_SIZE + offx;
            heightVal = tileArr[idx] ?? 0;
          }
        }
        ycrdData.push(heightVal * HEIGHT_WORLD_TO_PIXEL);
      }
    }
  } else if (level.heightmapLayer) {
    for (let row = 0; row <= depth; row++) {
      for (let col = 0; col <= width; col++) {
        const tileRow = Math.min(row, depth - 1);
        const tileCol = Math.min(col, width - 1);
        const tileIndex = tileRow * width + tileCol;
        const tileEntry = level.heightmapLayer[tileIndex];
        const heightValue = tileEntry ?? 0;
        ycrdData.push(heightValue * HEIGHT_WORLD_TO_PIXEL);
      }
    }
  }

  const ottoLevel: LevelData = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: level.textureAttributes.map((attr) => ({
          bits: attr.bits,
          parm0: attr.parm0,
          parm1: attr.parm1,
          parm2: attr.parm2,
          undefined: attr.undefined,
          flags: 0,
          p0: 0,
          p1: 0,
        })),
        order: 0,
      },
    },
    Fenc: { 1000: { name: "Fence List", obj: [], order: 0 } },
    FnNb: emptyRecord,
    Timg: {
      1000: {
        name: "Extracted Tile Image Data 32x32/16bit",
        data: "",
        order: 0,
      },
    },
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: level.objectList.length,
          mapWidth: width,
          mapHeight: depth,
          numTilePages: 1,
          numTiles: width * depth,
          tileSize: 32,
          minY: Math.min(...ycrdData, 0),
          maxY: Math.max(...ycrdData, 0),
          numSplines: 0,
          numFences: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: level.objectList.map((item) => ({
          x: item.x,
          y: item.y,
          z: item.y,
          type: item.type,
          parm: item.parm,
          flags: item.flags,
          prevItemIdx: item.prevItemIdx,
          nextItemIdx: item.nextItemIdx,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        })),
        order: 0,
      },
    },
    Layr: {
      1000: { name: "Terrain Layer Matrix", obj: level.textureLayer, order: 0 },
    },
    Liqd: { 1000: { name: "Water List", obj: [], order: 0 } },
    STgd: { 1000: { name: "SuperTile Grid", obj: [], order: 0 } },
    SpIt: emptyRecord,
    SpNb: emptyRecord,
    SpPt: emptyRecord,
    Spln: { 1000: { name: "Spline List", obj: [], order: 0 } },
    YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: ycrdData, order: 0 } },
    alis: emptyRecord,
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };

  return ottoLevel;
}

export const nanosaur1LevelToOttoMaticLevel = nanosaur1LevelToLevelData;
