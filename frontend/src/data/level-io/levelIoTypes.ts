import type { GlobalsInterface } from "@/data/globals/globals";

export interface LevelIoImagePayload {
  readonly width: number;
  readonly height: number;
  readonly rgbaBytes: ArrayBuffer;
}

export interface LevelIoProgress {
  readonly stage:
    | "parse.resource-fork"
    | "parse.validation"
    | "parse.images"
    | "serialize.resource-fork"
    | "serialize.textures"
    | "preview.ready";
  readonly message: string;
  readonly completed?: number;
  readonly total?: number;
}

export interface LevelIoSerializedFile {
  readonly filename: string;
  readonly extension: string;
  readonly bytes: Uint8Array;
}

export interface ParseLevelRequest {
  readonly requestId: string;
  readonly type: "parse-level";
  readonly globals: GlobalsInterface;
  readonly fileName: string;
  readonly levelBytes: ArrayBuffer;
  readonly mightyMikeTilesetBytes?: ArrayBuffer;
  readonly mightyMikePaletteBytes?: ArrayBuffer;
  readonly mightyMikeSceneName?: string;
}

export interface SerializeDownloadRequest {
  readonly requestId: string;
  readonly type: "serialize-download";
  readonly globals: GlobalsInterface;
  readonly fileName: string;
  readonly mapImagesFileName?: string;
  readonly levelData: unknown;
  readonly mapImages: readonly LevelIoImagePayload[];
}

export interface PreparePreviewRequest {
  readonly requestId: string;
  readonly type: "prepare-preview";
  readonly globals: GlobalsInterface;
  readonly levelData: unknown;
  readonly mapImages: readonly LevelIoImagePayload[];
}

export type LevelIoRequest =
  | ParseLevelRequest
  | SerializeDownloadRequest
  | PreparePreviewRequest;

export interface LevelIoProgressResponse {
  readonly requestId: string;
  readonly type: "progress";
  readonly progress: LevelIoProgress;
}

export interface ParsedLevelResponse {
  readonly requestId: string;
  readonly type: "parsed-level";
  readonly levelData: unknown;
  readonly mapImages: readonly LevelIoImagePayload[];
  readonly collisionImages: readonly LevelIoImagePayload[];
  readonly nanosaurRawBytes?: ArrayBuffer;
}

export interface SerializedDownloadResponse {
  readonly requestId: string;
  readonly type: "serialized-download";
  readonly files: readonly LevelIoSerializedFile[];
}

export interface PreparedPreviewResponse {
  readonly requestId: string;
  readonly type: "prepared-preview";
  readonly dataBytes: Uint8Array | null;
  readonly rsrcBytes: Uint8Array | null;
  readonly textureBytes: Uint8Array | null;
}

export interface FailedLevelIoResponse {
  readonly requestId: string;
  readonly type: "failed";
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export type LevelIoResponse =
  | LevelIoProgressResponse
  | ParsedLevelResponse
  | SerializedDownloadResponse
  | PreparedPreviewResponse
  | FailedLevelIoResponse;
