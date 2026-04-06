/**
 * Big-endian binary reader for parsing 3DMF files
 * 3DMF files use big-endian byte order
 */

import { ok, err, type Result } from "neverthrow";

export class BigEndianReader {
  private view: DataView;
  private offset: number;
  private buffer: ArrayBuffer;

  constructor(buffer: ArrayBuffer, initialOffset = 0) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.offset = initialOffset;
  }

  /**
   * Get current read position
   */
  tell(): number {
    return this.offset;
  }

  /**
   * Seek to an absolute position
   */
  goto(offset: number): void {
    this.offset = offset;
  }

  /**
   * Skip bytes from current position
   */
  skip(bytes: number): void {
    this.offset += bytes;
  }

  /**
   * Get remaining bytes in buffer
   */
  remaining(): number {
    return this.buffer.byteLength - this.offset;
  }

  /**
   * Check if we've reached the end of the buffer
   */
  isEOF(): boolean {
    return this.offset >= this.buffer.byteLength;
  }

  /**
   * Get the total length of the buffer
   */
  length(): number {
    return this.buffer.byteLength;
  }

  /**
   * Read a uint8
   */
  readUint8(): Result<number, Error> {
    if (this.offset + 1 > this.buffer.byteLength) {
      return err(new Error(`EOF reading uint8 at offset ${this.offset}`));
    }
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return ok(value);
  }

  /**
   * Read a uint16 (big-endian)
   */
  readUint16(): Result<number, Error> {
    if (this.offset + 2 > this.buffer.byteLength) {
      return err(new Error(`EOF reading uint16 at offset ${this.offset}`));
    }
    const value = this.view.getUint16(this.offset, false);
    this.offset += 2;
    return ok(value);
  }

  /**
   * Read a uint32 (big-endian)
   */
  readUint32(): Result<number, Error> {
    if (this.offset + 4 > this.buffer.byteLength) {
      return err(new Error(`EOF reading uint32 at offset ${this.offset}`));
    }
    const value = this.view.getUint32(this.offset, false);
    this.offset += 4;
    return ok(value);
  }

  /**
   * Read a uint64 (big-endian) as a JavaScript number.
   * 
   * Note: JavaScript Number type can only safely represent integers up to
   * Number.MAX_SAFE_INTEGER (2^53 - 1 = 9,007,199,254,740,991). Values
   * larger than this may lose precision. For 3DMF files, this is typically
   * acceptable as file offsets rarely exceed this limit.
   * 
   * @returns Result<number, Error> The 64-bit integer as a JavaScript number
   */
  readUint64(): Result<number, Error> {
    if (this.offset + 8 > this.buffer.byteLength) {
      return err(new Error(`EOF reading uint64 at offset ${this.offset}`));
    }
    const high = this.view.getUint32(this.offset, false);
    const low = this.view.getUint32(this.offset + 4, false);
    this.offset += 8;
    // Combine as JavaScript number (safe for values <= Number.MAX_SAFE_INTEGER)
    const value = high * 0x100000000 + low;
    return ok(value);
  }

  /**
   * Read a float32 (big-endian)
   */
  readFloat32(): Result<number, Error> {
    if (this.offset + 4 > this.buffer.byteLength) {
      return err(new Error(`EOF reading float32 at offset ${this.offset}`));
    }
    const value = this.view.getFloat32(this.offset, false);
    this.offset += 4;
    return ok(value);
  }

  /**
   * Read raw bytes
   */
  readBytes(count: number): Result<Uint8Array, Error> {
    if (this.offset + count > this.buffer.byteLength) {
      return err(new Error(`EOF reading ${count} bytes at offset ${this.offset}`));
    }
    const bytes = new Uint8Array(this.buffer, this.offset, count);
    this.offset += count;
    return ok(bytes);
  }

  /**
   * Read a FourCC code as a string
   */
  readFourCC(): Result<string, Error> {
    const result = this.readUint32();
    if (result.isErr()) {
      return err(result.error);
    }
    const fourCC = result.value;
    return ok(String.fromCharCode(
      (fourCC >> 24) & 0xff,
      (fourCC >> 16) & 0xff,
      (fourCC >> 8) & 0xff,
      fourCC & 0xff
    ));
  }

  /**
   * Get a copy of the internal buffer slice
   */
  getBufferSlice(start: number, end: number): Uint8Array {
    return new Uint8Array(this.buffer.slice(start, end));
  }

  /**
   * Get the raw buffer
   */
  getBuffer(): ArrayBuffer {
    return this.buffer;
  }
}

/**
 * Big-endian binary writer for creating 3DMF files
 */
export class BigEndianWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;
  private capacity: number;

  constructor(initialCapacity: number = 1024 * 1024) { // 1MB default
    this.capacity = initialCapacity;
    this.buffer = new ArrayBuffer(this.capacity);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  /**
   * Ensure we have enough capacity for additional bytes
   */
  private ensureCapacity(additionalBytes: number): void {
    const required = this.offset + additionalBytes;
    if (required > this.capacity) {
      // Double capacity until we have enough
      while (this.capacity < required) {
        this.capacity *= 2;
      }
      const newBuffer = new ArrayBuffer(this.capacity);
      const newArray = new Uint8Array(newBuffer);
      newArray.set(new Uint8Array(this.buffer, 0, this.offset));
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer);
    }
  }

  /**
   * Get current write position
   */
  tell(): number {
    return this.offset;
  }

  /**
   * Seek to an absolute position
   */
  goto(offset: number): void {
    this.ensureCapacity(offset - this.offset);
    this.offset = offset;
  }

  /**
   * Write a uint8
   */
  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  /**
   * Write a uint16 (big-endian)
   */
  writeUint16(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, false);
    this.offset += 2;
  }

  /**
   * Write a uint32 (big-endian)
   */
  writeUint32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, false);
    this.offset += 4;
  }

  /**
   * Write a uint64 (big-endian)
   */
  writeUint64(value: number): void {
    this.ensureCapacity(8);
    const high = Math.floor(value / 0x100000000);
    const low = value >>> 0;
    this.view.setUint32(this.offset, high, false);
    this.view.setUint32(this.offset + 4, low, false);
    this.offset += 8;
  }

  /**
   * Write a float32 (big-endian)
   */
  writeFloat32(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, value, false);
    this.offset += 4;
  }

  /**
   * Write raw bytes
   */
  writeBytes(bytes: Uint8Array): void {
    this.ensureCapacity(bytes.length);
    const target = new Uint8Array(this.buffer, this.offset, bytes.length);
    target.set(bytes);
    this.offset += bytes.length;
  }

  /**
   * Write a FourCC code from string
   */
  writeFourCC(str: string): Result<void, Error> {
    if (str.length !== 4) {
      return err(new Error(`FourCC must be exactly 4 characters: ${str}`));
    }
    const value =
      ((str.charCodeAt(0) & 0xff) << 24) |
      ((str.charCodeAt(1) & 0xff) << 16) |
      ((str.charCodeAt(2) & 0xff) << 8) |
      (str.charCodeAt(3) & 0xff);
    this.writeUint32(value);
    return ok(undefined);
  }

  /**
   * Get the final buffer (trimmed to actual content)
   */
  getBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.offset);
  }

  /**
   * Get the current size of written data
   */
  size(): number {
    return this.offset;
  }
}
