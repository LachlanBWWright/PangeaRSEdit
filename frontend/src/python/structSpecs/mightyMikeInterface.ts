export interface MightyMikeTileSet {
  numTileDefinitions: number;
  numXlateEntries: number;
  numTileAttributeEntries: number;
  numTileAnims: number;
  numTileXparentColors: number;
  xlateTable: number[];
  tileAttributes: MightyMikeTileAttribute[];
  tileAnimations: MightyMikeTileAnimation[];
  transparencyColors: number[];
  tileImages?: HTMLCanvasElement[]; // Optional tile images extracted from tileset
}

export interface MightyMikeTileAttribute {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export interface MightyMikeTileAnimation {
  name: string;
  speed: number;
  baseTile: number;
  numFrames: number;
  tileNums: number[];
}

export interface MightyMikeMap {
  mapWidth: number;
  mapHeight: number;
  numItems: number;
  mapImage: number[][];
  items: MightyMikeItem[];
  altMap: number[][] | null;
}

export interface MightyMikeItem {
  x: number;
  y: number;
  type: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

export interface MightyMikeLevel {
  tileset: MightyMikeTileSet;
  map: MightyMikeMap;
}
