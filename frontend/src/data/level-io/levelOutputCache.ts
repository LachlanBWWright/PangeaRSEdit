import { DataType, type GlobalsInterface } from "@/data/globals/globals";
import type {
  LevelIoImagePayload,
  LevelIoSerializedFile,
} from "./levelIoTypes";

const CACHE_VERSION = "level-output-cache-v1";
const MAX_CACHE_BYTES = 96 * 1024 * 1024;

export type LevelOutputArtifact = "level" | "texture" | "combined";

export interface LevelOutputCacheKeys {
  readonly level: string;
  readonly texture: string;
  readonly combined: string;
}

export interface LevelOutputReuse {
  readonly reuseLevelBytes?: Uint8Array;
  readonly reuseTextureBytes?: Uint8Array;
  readonly reuseCombinedBytes?: Uint8Array;
}

interface CacheEntry {
  readonly bytes: Uint8Array;
  readonly size: number;
  lastUsed: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableSerialize(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof ArrayBuffer) {
    return `buffer:${Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return `bigint:${String(value)}`;
  if (typeof value === "undefined") return "undefined";
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(",")}}`;
  }
  return String(value);
}

function hashText(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function contentHash(value: unknown): string {
  const serialized = stableSerialize(value);
  return `${hashText(serialized, 0x811c9dc5)}${hashText(serialized, 0x9e3779b9)}`;
}

function imageContent(mapImages: readonly LevelIoImagePayload[]): unknown {
  return mapImages.map((image) => ({
    width: image.width,
    height: image.height,
    rgbaBytes: image.rgbaBytes,
  }));
}

function formatIdentity(globals: GlobalsInterface): string {
  return `${String(globals.GAME_TYPE)}:${String(globals.DATA_TYPE)}:${String(globals.TILE_IMAGE_FORMAT)}`;
}

export function getLevelOutputCacheKeys(
  levelData: unknown,
  globals: GlobalsInterface,
  mapImages: readonly LevelIoImagePayload[],
): LevelOutputCacheKeys {
  const format = formatIdentity(globals);
  const levelHash = contentHash(levelData);
  const textureHash = contentHash(imageContent(mapImages));
  const level = `${CACHE_VERSION}:${format}:level:${levelHash}`;
  const texture = `${CACHE_VERSION}:${format}:texture:${textureHash}`;
  const combined = `${CACHE_VERSION}:${format}:combined:${levelHash}:${textureHash}`;

  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    return { level: combined, texture: combined, combined };
  }

  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    return { level, texture: combined, combined };
  }

  return { level, texture, combined };
}

export class LevelOutputCache {
  private readonly entries = new Map<string, CacheEntry>();
  private totalBytes = 0;
  private clock = 0;

  get(key: string): Uint8Array | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    this.clock += 1;
    entry.lastUsed = this.clock;
    return Uint8Array.from(entry.bytes);
  }

  set(key: string, bytes: Uint8Array): void {
    const copy = Uint8Array.from(bytes);
    const previous = this.entries.get(key);
    if (previous) this.totalBytes -= previous.size;
    this.clock += 1;
    this.entries.set(key, { bytes: copy, size: copy.byteLength, lastUsed: this.clock });
    this.totalBytes += copy.byteLength;
    this.evictIfNeeded();
  }

  clear(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }

  get size(): number {
    return this.entries.size;
  }

  private evictIfNeeded(): void {
    while (this.totalBytes > MAX_CACHE_BYTES && this.entries.size > 0) {
      const oldest = [...this.entries.entries()].sort(
        ([, left], [, right]) => left.lastUsed - right.lastUsed,
      )[0];
      if (!oldest) return;
      this.entries.delete(oldest[0]);
      this.totalBytes -= oldest[1].size;
    }
  }
}

export const levelOutputCache = new LevelOutputCache();

export function getLevelOutputReuse(
  globals: GlobalsInterface,
  keys: LevelOutputCacheKeys,
): LevelOutputReuse {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    return { reuseCombinedBytes: levelOutputCache.get(keys.combined) ?? undefined };
  }
  return {
    reuseLevelBytes: levelOutputCache.get(keys.level) ?? undefined,
    reuseTextureBytes: levelOutputCache.get(keys.texture) ?? undefined,
  };
}

export interface CachedPreviewArtifacts {
  readonly dataBytes: Uint8Array | null;
  readonly rsrcBytes: Uint8Array | null;
  readonly textureBytes: Uint8Array | null;
}

export function getCachedPreviewArtifacts(
  globals: GlobalsInterface,
  reuse: LevelOutputReuse,
  hasImages: boolean,
): CachedPreviewArtifacts | null {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    return reuse.reuseCombinedBytes
      ? { dataBytes: null, rsrcBytes: reuse.reuseCombinedBytes, textureBytes: null }
      : null;
  }
  if (!reuse.reuseLevelBytes) return null;
  if (hasImages && !reuse.reuseTextureBytes) return null;
  if (globals.DATA_TYPE === DataType.TRT_FILE) {
    return {
      dataBytes: reuse.reuseLevelBytes,
      rsrcBytes: null,
      textureBytes: reuse.reuseTextureBytes ?? null,
    };
  }
  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    return {
      dataBytes: reuse.reuseLevelBytes,
      rsrcBytes: null,
      textureBytes: reuse.reuseTextureBytes ?? null,
    };
  }
  return {
    dataBytes: reuse.reuseTextureBytes ?? null,
    rsrcBytes: reuse.reuseLevelBytes,
    textureBytes: null,
  };
}

export function getCachedDownloadFiles(
  globals: GlobalsInterface,
  reuse: LevelOutputReuse,
  fileName: string,
  mapImagesFileName: string | undefined,
  hasImages: boolean,
): readonly LevelIoSerializedFile[] | null {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    return reuse.reuseCombinedBytes
      ? [{ filename: fileName, extension: ".ter.rsrc", bytes: reuse.reuseCombinedBytes }]
      : null;
  }
  if (!reuse.reuseLevelBytes || (hasImages && !reuse.reuseTextureBytes)) return null;
  if (globals.DATA_TYPE === DataType.TRT_FILE) {
    return [
      { filename: fileName, extension: ".ter", bytes: reuse.reuseLevelBytes },
      {
        filename: mapImagesFileName ?? fileName,
        extension: ".trt",
        bytes: reuse.reuseTextureBytes ?? new Uint8Array(),
      },
    ];
  }
  if (globals.DATA_TYPE === DataType.MIGHTY_MIKE) {
    return reuse.reuseTextureBytes
      ? [
          { filename: fileName, extension: ".map", bytes: reuse.reuseLevelBytes },
          {
            filename: mapImagesFileName ?? fileName,
            extension: ".tileset",
            bytes: reuse.reuseTextureBytes,
          },
        ]
      : null;
  }
  return [
    {
      filename: fileName,
      extension: ".ter.rsrc",
      bytes: reuse.reuseLevelBytes,
    },
    ...(hasImages && reuse.reuseTextureBytes
      ? [
          {
            filename: mapImagesFileName ?? "images",
            extension: ".ter",
            bytes: reuse.reuseTextureBytes,
          },
        ]
      : []),
  ];
}

export function cachePreviewArtifacts(
  globals: GlobalsInterface,
  keys: LevelOutputCacheKeys,
  output: {
    readonly dataBytes: Uint8Array | null;
    readonly rsrcBytes: Uint8Array | null;
    readonly textureBytes: Uint8Array | null;
  },
): void {
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    if (output.rsrcBytes) levelOutputCache.set(keys.combined, output.rsrcBytes);
    return;
  }
  if (output.dataBytes) {
    levelOutputCache.set(
      globals.DATA_TYPE === DataType.TRT_FILE ? keys.level : keys.texture,
      output.dataBytes,
    );
  }
  if (output.rsrcBytes) levelOutputCache.set(keys.level, output.rsrcBytes);
  if (output.textureBytes) levelOutputCache.set(keys.texture, output.textureBytes);
}

export function cacheDownloadArtifacts(
  globals: GlobalsInterface,
  keys: LevelOutputCacheKeys,
  files: readonly LevelIoSerializedFile[],
): void {
  const first = files[0]?.bytes;
  const second = files[1]?.bytes;
  if (globals.DATA_TYPE === DataType.RSRC_FORK) {
    if (first) levelOutputCache.set(keys.combined, first);
    return;
  }
  if (first) levelOutputCache.set(keys.level, first);
  if (second) levelOutputCache.set(keys.texture, second);
}
