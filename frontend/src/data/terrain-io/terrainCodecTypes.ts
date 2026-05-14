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

export interface DecodedTerrainTileBuffer {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly rgbaBytes: ArrayBuffer;
}

export interface TerrainDecodeProgress {
  readonly completed: number;
  readonly total: number;
}

export interface DecodedTerrainTile {
  readonly id: number;
  readonly imageData: ImageData;
}

export interface EncodedTerrainTileBuffer {
  readonly id: number;
  readonly encodedBytes: ArrayBuffer;
  readonly imageDescriptionBytes?: ArrayBuffer;
}

export interface EncodeLzssTerrainTileRequest {
  readonly rgbaBytes: ArrayBuffer;
  readonly width: number;
  readonly height: number;
}

export interface EncodeJpegTerrainTileRequest extends EncodeLzssTerrainTileRequest {
  readonly quality: number;
}

export interface DecodeLzssTerrainTileRequest {
  readonly compressedBytes: ArrayBuffer;
  readonly width: number;
  readonly height: number;
}

export interface DecodeJpegTerrainTileRequest {
  readonly jpegBytes: ArrayBuffer;
  readonly width: number;
  readonly height: number;
}

export interface TerrainCodecRuntimeInfo {
  readonly backend: "wasm" | "typescript";
  readonly threadMode: "threaded" | "single";
  readonly crossOriginIsolated: boolean;
}
