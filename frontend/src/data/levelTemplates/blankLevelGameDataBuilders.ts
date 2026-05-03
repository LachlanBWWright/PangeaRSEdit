import type {
  Nanosaur1LevelData,
  TileAttribType,
} from "@/data/processors/classicProprocessor";
import type {
  MightyMikeMap,
  MightyMikeTileSet,
  MightyMikeTileValue,
} from "@/python/structSpecs/mightyMikeInterface";

/** Builds an empty classic Nanosaur level with the requested dimensions. */
export function buildBlankNanosaurRawLevel(
  width: number,
  height: number,
  defaultHeight: number,
): Nanosaur1LevelData {
  const tileAttributes: TileAttribType[] = [];
  for (let i = 0; i < width * height; i++) {
    tileAttributes.push({
      bits: 0,
      parm0: 0,
      parm1: 0,
      parm2: 0,
      undefined: 0,
    });
  }

  return {
    header: {
      textureLayerOffset: 0,
      heightmapLayerOffset: 0,
      pathLayerOffset: 0,
      objectListOffset: 0,
      unknown1: 0,
      heightmapTilesOffset: 0,
      unknown2: 0,
      width,
      depth: height,
      textureAttribOffset: 0,
      tileAnimDataOffset: 0,
    },
    textureLayer: new Array(width * height).fill(0),
    heightmapLayer: new Array(width * height).fill(defaultHeight),
    pathLayer: new Array(width * height).fill(0),
    heightmapTiles: null,
    objectList: [],
    textureAttributes: tileAttributes,
    heightmapPadding: null,
    tileAnimData: null,
  };
}

/** Builds empty Mighty Mike map and tileset data structures for a new level. */
export function buildBlankMightyMikeData(
  width: number,
  height: number,
): {
  blankMap: MightyMikeMap;
  flatTileValues: MightyMikeTileValue[];
  blankTileSet: MightyMikeTileSet;
} {
  const tileValue: MightyMikeTileValue = {
    rawValue: 0,
    tileIndex: 0,
    hasCollisionMask: false,
    usePixelAccurateCollision: false,
  };
  const mapImage: MightyMikeTileValue[][] = new Array(height)
    .fill(null)
    .map(() => new Array(width).fill(null).map(() => ({ ...tileValue })));
  const flatTileValues = mapImage.flat().map((value) => ({ ...value }));

  const blankMap: MightyMikeMap = {
    mapWidth: width,
    mapHeight: height,
    numItems: 0,
    mapImage,
    items: [],
    altMap: null,
    padding: 0,
  };

  const blankTileSet: MightyMikeTileSet = {
    numTileDefinitions: 1,
    numXlateEntries: 1,
    numTileAttributeEntries: 1,
    numTileAnims: 0,
    numTileXparentColors: 0,
    xlateTable: [0],
    tileAttributes: [{ flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, p4: 0 }],
    tileAnimations: [],
    transparencyColors: [],
  };

  return { blankMap, flatTileValues, blankTileSet };
}
