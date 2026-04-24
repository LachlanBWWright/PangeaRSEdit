/**
 * Pure functions for buffer operations
 *
 * These functions provide immutable, side-effect-free buffer manipulations
 * suitable for functional programming and easy testing
 */

import { ok, err, type Result } from "neverthrow";

/**
 * Read a big-endian 32-bit unsigned integer from a buffer at the specified offset
 */
export function readUint32BE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, Error> {
  if (offset < 0 || offset + 4 > buffer.byteLength) {
    return err(new Error("Buffer too small for uint32 read"));
  }
  const view = new DataView(buffer);
  return ok(view.getUint32(offset, false)); // false = big-endian
}

/**
 * Read a little-endian 32-bit unsigned integer from a buffer at the specified offset
 */
export function readUint32LE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, Error> {
  if (offset + 4 > buffer.byteLength) {
    return err(new Error("Buffer too small for uint32 read"));
  }
  const view = new DataView(buffer);
  return ok(view.getUint32(offset, true)); // true = little-endian
}

/**
 * Read a big-endian 16-bit unsigned integer from a buffer at the specified offset
 */
export function readUint16BE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, Error> {
  if (offset + 2 > buffer.byteLength) {
    return err(new Error("Buffer too small for uint16 read"));
  }
  const view = new DataView(buffer);
  return ok(view.getUint16(offset, false)); // false = big-endian
}

/**
 * Read a little-endian 16-bit unsigned integer from a buffer at the specified offset
 */
export function readUint16LE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, Error> {
  if (offset + 2 > buffer.byteLength) {
    return err(new Error("Buffer too small for uint16 read"));
  }
  const view = new DataView(buffer);
  return ok(view.getUint16(offset, true)); // true = little-endian
}

/**
 * Read an 8-bit unsigned integer from a buffer at the specified offset
 */
export function readUint8(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, Error> {
  if (offset + 1 > buffer.byteLength) {
    return err(new Error("Buffer too small for uint8 read"));
  }
  const view = new DataView(buffer);
  return ok(view.getUint8(offset));
}

/**
 * Write a big-endian 32-bit unsigned integer to a new buffer
 */
export function writeUint32BE(value: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, false); // false = big-endian
  return buffer;
}

/**
 * Write a little-endian 32-bit unsigned integer to a new buffer
 */
export function writeUint32LE(value: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, true); // true = little-endian
  return buffer;
}

/**
 * Slice a buffer without copying (returns a view)
 */
export function sliceBuffer(
  buffer: ArrayBuffer,
  start: number,
  end?: number,
): Result<ArrayBuffer, Error> {
  if (start < 0 || start > buffer.byteLength) {
    return err(new Error("Invalid start offset"));
  }
  if (
    end !== undefined &&
    (end < 0 || end > buffer.byteLength || end < start)
  ) {
    return err(new Error("Invalid end offset"));
  }
  return ok(buffer.slice(start, end));
}

/**
 * Create a new buffer by copying data from offset for length bytes
 */
export function copyBuffer(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
): Result<ArrayBuffer, Error> {
  if (offset + length > buffer.byteLength) {
    return err(
      new Error(
        `Invalid copy range: offset=${offset}, length=${length}, buffer size=${buffer.byteLength}`,
      ),
    );
  }
  const source = new Uint8Array(buffer, offset, length);
  const destination = new Uint8Array(length);
  destination.set(source);
  return ok(destination.buffer);
}

/**
 * Concatenate multiple buffers into a single buffer
 */
export function concatBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const buffer of buffers) {
    const view = new Uint8Array(buffer);
    result.set(view, offset);
    offset += buffer.byteLength;
  }

  return result.buffer;
}

/**
 * Compare two buffers and return first difference
 */
export function findFirstDifference(
  buffer1: ArrayBuffer,
  buffer2: ArrayBuffer,
): {
  equal: boolean;
  offset: number | null;
} {
  const view1 = new Uint8Array(buffer1);
  const view2 = new Uint8Array(buffer2);
  const minLen = Math.min(view1.length, view2.length);

  for (let i = 0; i < minLen; i++) {
    if (view1[i] !== view2[i]) return { equal: false, offset: i };
  }

  // Check for size differences
  if (view1.length !== view2.length) {
    return { equal: false, offset: minLen };
  }

  return { equal: true, offset: null };
}

/**
 * Create a buffer filled with repeated byte value
 */
export function createFilledBuffer(
  length: number,
  fillValue: number,
): ArrayBuffer {
  const buffer = new Uint8Array(length);
  buffer.fill(fillValue);
  return buffer.buffer;
}

/**
 * Hex encode a buffer to string
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hex decode a string to buffer
 */
export function hexToBuffer(hex: string): Result<ArrayBuffer, Error> {
  if (hex.length % 2 !== 0) {
    return err(new Error("Hex string must have even length"));
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (isNaN(byte))
      return err(
        new Error(
          `Invalid hex characters at position ${i}: ${hex.substr(i, 2)}`,
        ),
      );
    bytes[i / 2] = byte;
  }
  return ok(bytes.buffer);
}

/**
 * Get buffer statistics
 */
export function bufferStats(buffer: ArrayBuffer): {
  size: number;
  hex: string;
  first8Bytes: number[];
} {
  const view = new Uint8Array(buffer);
  const first8 = Array.from(view.slice(0, 8));
  return {
    size: buffer.byteLength,
    hex: bufferToHex(buffer.slice(0, Math.min(32, buffer.byteLength))),
    first8Bytes: first8,
  };
}
