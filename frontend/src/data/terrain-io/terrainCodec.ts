import { TileImageFormat, type GlobalsInterface } from "@/data/globals/globals";
import { err, ok, type Result } from "neverthrow";
import {
  type TerrainTextureChunk,
  type TerrainTextureCodec,
} from "@/data/terrain-io/terrainCodecTypes";
import {
  terrainIoError,
  type TerrainIoError,
} from "@/data/terrain-io/terrainIoErrors";

function copyBytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

export function selectTerrainCodec(
  globals: GlobalsInterface,
): Result<TerrainTextureCodec, TerrainIoError> {
  if (globals.TILE_IMAGE_FORMAT === TileImageFormat.JPG) {
    return ok({
      kind: "jpeg-supertile",
      supertileTexmapSize: globals.SUPERTILE_TEXMAP_SIZE,
    });
  }

  if (globals.TILE_IMAGE_FORMAT === TileImageFormat.LZSS_16_BIT) {
    return ok({
      kind: "lzss-rgb555",
      supertileTexmapSize: globals.SUPERTILE_TEXMAP_SIZE,
      bytesPerPixel: 2,
    });
  }

  return err(
    terrainIoError(
      "terrain.decode.bad-format",
      `Unsupported tile image format: ${String(globals.TILE_IMAGE_FORMAT)}`,
    ),
  );
}

export function readTerrainTextureChunks(
  dataView: DataView,
  codec: TerrainTextureCodec,
): Result<TerrainTextureChunk[], TerrainIoError> {
  let offset = 0;
  let id = 0;
  const chunks: TerrainTextureChunk[] = [];

  while (offset < dataView.byteLength) {
    const declaredSize = dataView.getInt32(offset);
    offset += 4;
    if (declaredSize === 0) {
      break;
    }

    if (codec.kind === "jpeg-supertile") {
      const imageDescriptionOffset = dataView.getInt32(offset);
      offset += imageDescriptionOffset;
      const jpegSize = declaredSize - imageDescriptionOffset;
      if (jpegSize <= 0 || offset + jpegSize > dataView.byteLength) {
        return err(
          terrainIoError(
            "terrain.decode.bad-format",
            "Invalid JPEG chunk size in terrain data",
          ),
        );
      }
      const bytes = new Uint8Array(
        dataView.buffer.slice(offset, offset + jpegSize),
      );
      chunks.push({ id, bytes: copyBytesToArrayBuffer(bytes) });
      offset += jpegSize;
      id += 1;
      continue;
    }

    if (offset + declaredSize > dataView.byteLength) {
      return err(
        terrainIoError(
          "terrain.decode.bad-format",
          "Invalid LZSS chunk size in terrain data",
        ),
      );
    }

    const bytes = new Uint8Array(
      dataView.buffer.slice(offset, offset + declaredSize),
    );
    chunks.push({ id, bytes: copyBytesToArrayBuffer(bytes) });
    offset += declaredSize;
    id += 1;
  }

  return ok(chunks);
}
