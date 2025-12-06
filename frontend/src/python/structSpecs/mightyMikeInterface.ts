export interface MightyMikeTileSet {
  num_tile_definitions: number;
  num_xlate_entries: number;
  num_tile_attribute_entries: number;
  num_tile_anims: number;
  num_tile_xparent_colors: number;
  xlate_table: number[];
  tile_attributes: MightyMikeTileAttribute[];
  tile_animations: MightyMikeTileAnimation[];
  transparency_colors: number[];
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
  base_tile: number;
  num_frames: number;
  tile_nums: number[];
}

export interface MightyMikeMap {
  map_width: number;
  map_height: number;
  num_items: number;
  map_image: number[][];
  items: MightyMikeItem[];
  alt_map: number[][] | null;
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
