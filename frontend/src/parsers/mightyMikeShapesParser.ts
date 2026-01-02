/**
 * Parser for Mighty Mike .shapes files
 *
 * .shapes file format (from Shape.c and shape.h):
 * - Header:
 *   - Offset to Color Table (int32_t, big-endian)
 *   - Offset to Shape List (int32_t, big-endian)
 *   - Offset to Animation List (int32_t, big-endian)
 *
 * - Color Table (at offsetToColorTable):
 *   - Number of colors (int16_t, big-endian)
 *   - Color entries (RGBColor structs: 3 int16_t values each)
 *
 * - Shape List (at offsetToShapeList):
 *   - Number of shapes (int16_t, big-endian)
 *   - Array of offsets to Shape Headers (int32_t[], big-endian)
 *
 * - Shape Header:
 *   - Shape flags (int32_t, big-endian) - offset 0
 *   - Offset to Frame List (int32_t, big-endian) - offset 2
 *   - Offset to Animation List (int32_t, big-endian) - offset 6
 *
 * - Frame List (at offsetToFrameList):
 *   - Number of frames (int16_t, big-endian)
 *   - Array of offsets to Frame Headers (int32_t[], big-endian)
 *
 * - Frame Header (FrameHeader struct, 16 bytes):
 *   - width (int16_t, big-endian)
 *   - height (int16_t, big-endian)
 *   - x (int16_t, big-endian) - origin offset
 *   - y (int16_t, big-endian) - origin offset
 *   - pixelOffset (int32_t, big-endian) - offset from shape base
 *   - maskOffset (int32_t, big-endian) - offset from shape base
 *
 * - Pixel/Mask Data:
 *   - 8-bit indexed color pixels
 *   - 1-bit mask (1 = opaque, 0 = transparent)
 */

import { Result, ok, err } from "../types/result";

/**
 * Decompress RLB-compressed data
 * From Shape.c DecompressRLBFile()
 * RLB format:
 * - Count byte: if > 0x7f, next byte is repeated (256 - count + 1) times
 * - Count byte: if <= 0x7f, next (count+1) bytes are literal
 */
function decompressRLB(compressedData: Uint8Array, decompSize: number): Uint8Array {
  const output = new Uint8Array(decompSize);
  let srcPos = 0;
  let dstPos = 0;

  while (dstPos < decompSize && srcPos < compressedData.length) {
    const countByte = compressedData[srcPos];
    if (countByte === undefined) break;
    srcPos++;

    if (countByte > 0x7f) {
      // Compressed: repeat data
      // From Shape.c line 425: count = (-count)+1 = 256 - count + 1 = 257 - count
      const repeatCount = 257 - countByte;
      if (srcPos >= compressedData.length) {
        break;
      }
      const dataByte = compressedData[srcPos];
      if (dataByte === undefined) break;
      srcPos++;
      for (let i = 0; i < repeatCount && dstPos < decompSize; i++) {
        output[dstPos++] = dataByte;
      }
    } else {
      // Uncompressed: literal data (count+1 bytes)
      const literalCount = countByte + 1;
      for (let i = 0; i < literalCount && dstPos < decompSize && srcPos < compressedData.length; i++) {
        const byte = compressedData[srcPos];
        if (byte === undefined) break;
        output[dstPos++] = byte;
        srcPos++;
      }
    }
  }

  return output.slice(0, dstPos);
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface FrameHeader {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  pixelOffset: number;
  maskOffset: number;
}

export interface ShapeFrame {
  header: FrameHeader;
  pixels: Uint8Array; // 8-bit indexed color data
  mask?: Uint8Array; // 1-bit mask data
}

export interface Shape {
  shapeIndex: number;
  frames: ShapeFrame[];
}

export interface ShapesFile {
  colorTable: RGBColor[];
  shapes: Shape[];
}

// Helper functions for reading big-endian integers

function readI16BE(view: DataView, offset: number): number {
  return view.getInt16(offset, false); // false = big-endian
}

function readI32BE(view: DataView, offset: number): number {
  return view.getInt32(offset, false); // false = big-endian
}

/**
 * Parse a Mighty Mike .shapes file
 */
export function parseShapesFile(buffer: ArrayBuffer): Result<ShapesFile, Error> {
  try {
    const view = new DataView(buffer);

    if (buffer.byteLength < 20) {
      return err(new Error("Shapes file too small"));
    }

    // Shapes files are packed with an 8-byte header (from LoadPackedFile in Misc.c):
    // Bytes 0-3: Decompressed size (int32_t, big-endian)
    // Bytes 4-7: Compression type (int32_t, big-endian)
    //   0 = RLB compression (PACK_TYPE_RLB)
    //   2 = no compression (PACK_TYPE_NONE)
    // Bytes 8+: Compressed/uncompressed shape data
    const decompSize = readI32BE(view, 0);
    const compressionType = readI32BE(view, 4);

    // Decompress if necessary
    const compressedData = new Uint8Array(buffer, 8); // data starts at byte 8

    let shapeBuffer: ArrayBuffer;
    if (compressionType === 0) {
      // RLB compressed (PACK_TYPE_RLB)
      const decompressed = decompressRLB(compressedData, decompSize);
      const maybeBuffer = decompressed.buffer;
      // Make a defensive copy so we always have an ArrayBuffer (avoid SharedArrayBuffer incompatibilities)
      const copied = new Uint8Array(maybeBuffer).slice();
      shapeBuffer = copied.buffer;
    } else if (compressionType === 2) {
      // Uncompressed (PACK_TYPE_NONE)
      shapeBuffer = buffer.slice(8);
    } else {
      return err(new Error(`Unsupported compression type: ${compressionType}`));
    }

    const shapeView = new DataView(shapeBuffer);
    const shapeBytes = new Uint8Array(shapeBuffer);

    // Read header offsets (from the shape data, not the file start)
    // Offset 0-3: Unknown/unused value (may be decompressed size or garbage)
    // Offset 4-7: Offset to Shape List (int32_t, big-endian)
    // Note: File does NOT seem to contain color table offset. The color table is always absent
    // or located at the end of the file and is not used by the game.
    // See Shape.c line 139-140: "Mighty Mike always sets palette colors from image files,
    // never from shape files."

    const offsetToShapeList = readI32BE(shapeView, 4);

    // Validate offset
    if (
      offsetToShapeList < 0 ||
      offsetToShapeList >= shapeBuffer.byteLength
    ) {
      return err(new Error("Invalid shape list offset in shapes file header"));
    }

    // Create a default color table (since the file doesn't contain valid color data)
    const colorTable: RGBColor[] = [];
    for (let i = 0; i < 256; i++) {
      // Create a grayscale palette as default
      // In practice, Mighty Mike loads colors from image files, not the shape file
      const gray = Math.floor((i / 256) * 255);
      colorTable.push({ r: gray, g: gray, b: gray });
    }

    // Parse shapes
    const shapesResult = parseShapeList(
      shapeView,
      shapeBytes,
      offsetToShapeList
    );
    if (!shapesResult.success) {
      const errorMsg = shapesResult.error instanceof Error ? shapesResult.error.message : String(shapesResult.error || "Unknown error");
      return err(new Error(errorMsg));
    }

    return ok({
      colorTable,
      shapes: shapesResult.shapes,
    });
  } catch (error) {
    return err(
      error instanceof Error ? error : new Error("Unknown error parsing shapes file")
    );
  }
}

interface ShapeListResult {
  success: boolean;
  shapes: Shape[];
  error?: Error | string;
}

function parseShapeList(
  view: DataView,
  bytes: Uint8Array,
  offset: number
): ShapeListResult {
  try {
    const shapeCount = readI16BE(view, offset);

    if (shapeCount < 0 || shapeCount > 1000) {
      return {
        success: false,
        shapes: [],
        error: new Error(`Invalid shape count: ${shapeCount}`),
      };
    }

    const shapes: Shape[] = [];
    let pos = offset + 2; // Skip count

    // Read offsets to shape headers
    const shapeOffsets: number[] = [];
    for (let i = 0; i < shapeCount; i++) {
      if (pos + 4 > bytes.length) {
        return {
          success: false,
          shapes: [],
          error: new Error("Unexpected end of shape offset list"),
        };
      }
      shapeOffsets.push(readI32BE(view, pos));
      pos += 4;
    }

    // Parse each shape
    for (let i = 0; i < shapeCount; i++) {
      const shapeBase = shapeOffsets[i];

      if (shapeBase === undefined ||
        shapeBase < 0 ||
        shapeBase + 8 > bytes.length
      ) {
        return {
          success: false,
          shapes: [],
          error: new Error(
            `Invalid shape header offset at shape ${i}: ${shapeBase}`
          ),
        };
      }

      const frameListOffset = readI32BE(view, shapeBase + 2);

      if (frameListOffset < 0 || shapeBase + frameListOffset >= bytes.length) {
        return {
          success: false,
          shapes: [],
          error: new Error(
            `Invalid frame list offset in shape ${i}: ${frameListOffset}`
          ),
        };
      }

      const frameListPos = shapeBase + frameListOffset;
      const frameCount = readI16BE(view, frameListPos);

      if (frameCount < 0 || frameCount > 1000) {
        return {
          success: false,
          shapes: [],
          error: new Error(
            `Invalid frame count in shape ${i}: ${frameCount}`
          ),
        };
      }

      const frames: ShapeFrame[] = [];
      let framePos = frameListPos + 2;

      // Read frame offsets
      const frameOffsets: number[] = [];
      for (let f = 0; f < frameCount; f++) {
        if (framePos + 4 > bytes.length) {
          return {
            success: false,
            shapes: [],
            error: new Error(
              `Unexpected end of frame offset list in shape ${i}`
            ),
          };
        }
        frameOffsets.push(readI32BE(view, framePos));
        framePos += 4;
      }

      // Parse each frame
      for (let f = 0; f < frameCount; f++) {
        const frameOffset = frameOffsets[f];
        if (frameOffset === undefined) {
          return {
            success: false,
            shapes: [],
            error: new Error(
              `Frame offset ${f} not found in frame list for shape ${i}`
            ),
          };
        }

        const frameHeaderPos = shapeBase + frameOffset;

        if (frameHeaderPos + 16 > bytes.length) {
          return {
            success: false,
            shapes: [],
            error: new Error(
              `Invalid frame header in shape ${i}, frame ${f}`
            ),
          };
        }

        const header: FrameHeader = {
          width: readI16BE(view, frameHeaderPos),
          height: readI16BE(view, frameHeaderPos + 2),
          offsetX: readI16BE(view, frameHeaderPos + 4),
          offsetY: readI16BE(view, frameHeaderPos + 6),
          pixelOffset: readI32BE(view, frameHeaderPos + 8),
          maskOffset: readI32BE(view, frameHeaderPos + 12),
        };

        // Validate frame dimensions
        if (header.width < 0 || header.width > 2048 ||
            header.height < 0 || header.height > 2048) {
          return {
            success: false,
            shapes: [],
            error: new Error(
              `Invalid frame dimensions in shape ${i}, frame ${f}: ${header.width}x${header.height}`
            ),
          };
        }

        // Extract pixel data
        const pixelDataSize = header.width * header.height;
        const pixelStartOffset = shapeBase + header.pixelOffset;

        if (pixelStartOffset + pixelDataSize > bytes.length) {
          return {
            success: false,
            shapes: [],
            error: new Error(
              `Pixel data out of bounds in shape ${i}, frame ${f}`
            ),
          };
        }

        const pixels = bytes.slice(
          pixelStartOffset,
          pixelStartOffset + pixelDataSize
        );

        // Extract mask data if present
        let mask: Uint8Array | undefined;
        if (header.maskOffset > 0) {
          const maskStartOffset = shapeBase + header.maskOffset;
          const maskSize = Math.ceil((header.width * header.height) / 8);

          if (maskStartOffset + maskSize <= bytes.length) {
            mask = bytes.slice(maskStartOffset, maskStartOffset + maskSize);
          }
        }

        frames.push({
          header,
          pixels,
          mask,
        });
      }

      shapes.push({
        shapeIndex: i,
        frames,
      });
    }

    return { success: true, shapes };
  } catch (error) {
    return {
      success: false,
      shapes: [],
      error:
        error instanceof Error ? error : new Error("Error parsing shapes list"),
    };
  }
}

/**
 * Convert a shape frame to an HTML Canvas for display
 */
export function shapeFrameToCanvas(
  frame: ShapeFrame,
  colorTable: RGBColor[]
): Result<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = frame.header.width;
  canvas.height = frame.header.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return err(new Error("Could not get canvas context"));
  }

  const imageData = ctx.createImageData(
    frame.header.width,
    frame.header.height
  );
  const data = imageData.data;

  // Fill in pixel data
  for (let i = 0; i < frame.pixels.length; i++) {
    const colorIndex = frame.pixels[i] ?? 0;
    const color = colorTable[colorIndex] || { r: 0, g: 0, b: 0 };

    // Check mask to determine transparency
    let alpha = 255;
    if (frame.mask) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      const maskByte = frame.mask[byteIndex];
      if (maskByte !== undefined) {
        const isOpaque = (maskByte & (1 << bitIndex)) !== 0;
        alpha = isOpaque ? 255 : 0;
      }
    }

    data[i * 4 + 0] = color.r; // R
    data[i * 4 + 1] = color.g; // G
    data[i * 4 + 2] = color.b; // B
    data[i * 4 + 3] = alpha; // A
  }

  ctx.putImageData(imageData, 0, 0);
  return ok(canvas);
}
