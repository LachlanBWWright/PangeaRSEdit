import type { ShapesFile } from "@/parsers/mightyMikeShapesParser";
import type { MightyMikeTileset } from "@/parsers/mightyMikeTilesetParser";

export type FileType = "sprites" | "tga" | "tileset";
export type EditMode = "view" | "paint" | "erase" | "eyedropper";

export interface SpriteRenderParams {
  readonly originX: number;
  readonly originY: number;
  readonly zoom: number;
  readonly spriteOffsetX: number;
  readonly spriteOffsetY: number;
  readonly spriteW: number;
  readonly spriteH: number;
}

export interface SpriteData {
  readonly type: "sprites";
  readonly data: ShapesFile;
  readonly filename: string;
  readonly sourceBytes: ArrayBuffer;
}

export interface TGAData {
  readonly type: "tga";
  readonly data: HTMLCanvasElement;
  readonly filename: string;
  readonly sourceBytes: ArrayBuffer;
}

export interface TilesetData {
  readonly type: "tileset";
  readonly data: MightyMikeTileset;
  readonly gridCanvas: HTMLCanvasElement;
  readonly filename: string;
  readonly sourceBytes: ArrayBuffer;
}

export type LoadedData = SpriteData | TGAData | TilesetData | null;
