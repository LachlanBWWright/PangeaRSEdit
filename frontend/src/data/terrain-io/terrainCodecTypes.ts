export type TerrainTextureCodec =
  | {
      readonly kind: "lzss-rgb555";
      readonly supertileTexmapSize: number;
      readonly bytesPerPixel: 2;
    }
  | {
      readonly kind: "jpeg-supertile";
      readonly supertileTexmapSize: number;
    };

export interface TerrainTextureChunk {
  readonly id: number;
  readonly bytes: ArrayBuffer;
}

export interface TerrainDecodeProgress {
  readonly completed: number;
  readonly total: number;
}

export interface DecodedTerrainTile {
  readonly id: number;
  readonly imageData: ImageData;
}
