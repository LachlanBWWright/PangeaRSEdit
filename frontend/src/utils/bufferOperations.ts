/** Pure functions for buffer operations. */

import { ok, err, type Result } from "neverthrow";

/** Reads a big-endian 32-bit unsigned integer from a buffer at the given offset. */
export function readUint32BE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, string> {
  if (offset < 0 || offset + 4 > buffer.byteLength) {
    return err("Buffer too small for uint32 read");
  }
  const view = new DataView(buffer);
  return ok(view.getUint32(offset, false)); // false = big-endian
}

/** Reads a little-endian 32-bit unsigned integer from a buffer at the given offset. */
export function readUint32LE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, string> {
  if (offset + 4 > buffer.byteLength) {
    return err("Buffer too small for uint32 read");
  }
  const view = new DataView(buffer);
  return ok(view.getUint32(offset, true)); // true = little-endian
}

/** Reads a big-endian 16-bit unsigned integer from a buffer at the given offset. */
export function readUint16BE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, string> {
  if (offset + 2 > buffer.byteLength) {
    return err("Buffer too small for uint16 read");
  }
  const view = new DataView(buffer);
  return ok(view.getUint16(offset, false)); // false = big-endian
}

/** Reads a little-endian 16-bit unsigned integer from a buffer at the given offset. */
export function readUint16LE(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, string> {
  if (offset + 2 > buffer.byteLength) {
    return err("Buffer too small for uint16 read");
  }
  const view = new DataView(buffer);
  return ok(view.getUint16(offset, true)); // true = little-endian
}

/** Reads an 8-bit unsigned integer from a buffer at the given offset. */
export function readUint8(
  buffer: ArrayBuffer,
  offset: number,
): Result<number, string> {
  if (offset + 1 > buffer.byteLength) {
    return err("Buffer too small for uint8 read");
  }
  const view = new DataView(buffer);
  return ok(view.getUint8(offset));
}

/** Writes a big-endian 32-bit unsigned integer into a new buffer. */
export function writeUint32BE(value: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, false); // false = big-endian
  return buffer;
}

/** Writes a little-endian 32-bit unsigned integer into a new buffer. */
export function writeUint32LE(value: number): ArrayBuffer {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, value, true); // true = little-endian
  return buffer;
}

/** Returns a sliced buffer view after validating the requested range. */
export function sliceBuffer(
  buffer: ArrayBuffer,
  start: number,
  end?: number,
): Result<ArrayBuffer, string> {
  if (start < 0 || start > buffer.byteLength) {
    return err("Invalid start offset");
  }
  if (
    end !== undefined &&
    (end < 0 || end > buffer.byteLength || end < start)
  ) {
    return err("Invalid end offset");
  }
  return ok(buffer.slice(start, end));
}

/** Copies a range of bytes into a new standalone buffer. */
export function copyBuffer(
  buffer: ArrayBuffer,
  offset: number,
  length: number,
): Result<ArrayBuffer, string> {
  if (offset + length > buffer.byteLength) {
    return err(
      `Invalid copy range: offset=${offset}, length=${length}, buffer size=${buffer.byteLength}`,
    );
  }
  const source = new Uint8Array(buffer, offset, length);
  const destination = new Uint8Array(length);
  destination.set(source);
  return ok(destination.buffer);
}

/** Concatenates multiple buffers into a single buffer. */
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

/** Compares two buffers and reports the first differing byte. */
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

/** Creates a buffer filled with a repeated byte value. */
export function createFilledBuffer(
  length: number,
  fillValue: number,
): ArrayBuffer {
  const buffer = new Uint8Array(length);
  buffer.fill(fillValue);
  return buffer.buffer;
}

/** Encodes a buffer as a lowercase hexadecimal string. */
export function bufferToHex(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  return Array.from(view)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Decodes a hexadecimal string into a buffer when the input is valid. */
export function hexToBuffer(hex: string): Result<ArrayBuffer, string> {
  if (hex.length % 2 !== 0) {
    return err("Hex string must have even length");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (isNaN(byte)) {
      return err(
        `Invalid hex characters at position ${i}: ${hex.substr(i, 2)}`,
      );
    }
    bytes[i / 2] = byte;
  }
  return ok(bytes.buffer);
}

/** Returns a small summary of buffer size and leading bytes for debugging. */
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
