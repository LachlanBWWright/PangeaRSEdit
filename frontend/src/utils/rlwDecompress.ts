/**
 * RLW (Run-Length Word) Decompression
 *
 * Used by Mighty Mike for map and tileset compression.
 * Format:
 * - First 4 bytes: decompressed size (big-endian)
 * - Next 4 bytes: compression type (big-endian), should be 6 for RLW
 * - Remaining bytes: compressed data
 *
 * Compressed format:
 * - 1 byte length indicator
 * - If bit 7 set (0x80): packed stream
 *   - Next 2 bytes (big-endian) are the word to repeat (count & 0x7F) + 1 times
 * - Otherwise: literal stream
 *   - Next (count + 1) * 2 bytes are literal 16-bit words
 *
 * All functions return Result types for explicit error handling.
 */

import { ok, err, type Result } from "neverthrow";

export const PACK_TYPE_RLB = 0;
export const PACK_TYPE_LZSS = 1;
export const PACK_TYPE_NONE = 2;
export const PACK_TYPE_ARTN = 3;
export const PACK_TYPE_HUFF = 4;
export const PACK_TYPE_LZW = 5;
export const PACK_TYPE_RLW = 6;

export interface DecompressedFile {
  data: ArrayBuffer;
  decompressedSize: number;
  compressionType: number;
}

/**
 * Decompresses an RLB-compressed file from Mighty Mike (byte-level run-length encoding)
 */
export function rlbDecompress(
  compressedBuffer: ArrayBuffer,
): Result<DecompressedFile, string> {
  const input = new DataView(compressedBuffer);

  // Read header
  const decompressedSize = input.getUint32(0, false); // big-endian
  const compressionType = input.getUint32(4, false); // big-endian

  if (compressionType !== PACK_TYPE_RLB) {
    return err("Expected RLB compression (type 0), got: ${compressionType}");
  }
  
  // Allocate output buffer
  const output = new Uint8Array(decompressedSize);
  
  let sourcePos = 8; // Start after header
  let outputPos = 0;
  const sourceEnd = compressedBuffer.byteLength;
  const inputBytes = new Uint8Array(compressedBuffer);
  
  while (sourcePos < sourceEnd && outputPos < decompressedSize) {
    // Read count byte
    const countByte = inputBytes[sourcePos++];
    
    if (countByte === undefined) {
      break; // Reached end of input
    }
    
    if (countByte > 0x7F) {
      // Packed run: repeat the following byte
      // Count byte is a negative number in two's complement (e.g., 0xFF = -1, 0xFE = -2)
      // Convert to positive run count: negate and add 1
      // Reference: games/mightymike/src/Heart/Misc.c line 425: count = (-count)+1;
      const runCount = (256 - countByte) + 1;
      const dataByte = inputBytes[sourcePos++];
      
      if (dataByte === undefined) {
        break; // Reached end of input
      }
      
      for (let i = 0; i < runCount && outputPos < decompressedSize; i++) {
        output[outputPos++] = dataByte;
      }
    } else {
      // Literal run: copy the following bytes
      const runCount = countByte + 1;
      
      for (let i = 0; i < runCount && outputPos < decompressedSize; i++) {
        const byte = inputBytes[sourcePos++];
        if (byte === undefined) {
          break; // Reached end of input
        }
        output[outputPos++] = byte;
      }
    }
  }

  return ok({ data: output.buffer, decompressedSize, compressionType });
}

/**
 * Decompresses an RLW-compressed file from Mighty Mike
 */
export function rlwDecompress(
  compressedBuffer: ArrayBuffer,
): Result<DecompressedFile, string> {
  const input = new DataView(compressedBuffer);

  // Read header
  const decompressedSize = input.getUint32(0, false); // big-endian
  const compressionType = input.getUint32(4, false); // big-endian

  // Handle uncompressed files
  if (compressionType === PACK_TYPE_NONE) {
    const data = compressedBuffer.slice(8);
    return ok({ data, decompressedSize, compressionType });
  }

  // Handle RLB compression (byte-level run-length)
  if (compressionType === PACK_TYPE_RLB) {
    return rlbDecompress(compressedBuffer);
  }

  if (compressionType !== PACK_TYPE_RLW) {
    return err("Unsupported compression type: ${compressionType}");
  }
  
  // Allocate output buffer
  const output = new ArrayBuffer(decompressedSize);
  const outputView = new DataView(output);
  
  let sourcePos = 8; // Start after header
  let outputPos = 0;
  const sourceEnd = compressedBuffer.byteLength;
  
  while (sourcePos < sourceEnd && outputPos < decompressedSize) {
    // Read length byte
    const lengthByte = input.getUint8(sourcePos++);
    
    if (lengthByte & 0x80) {
      // Packed stream: repeat the following word
      const runCount = (lengthByte & 0x7F) + 1;
      const seed = input.getUint16(sourcePos, false); // big-endian
      sourcePos += 2;
      
      for (let i = 0; i < runCount && outputPos + 2 <= decompressedSize; i++) {
        outputView.setUint16(outputPos, seed, false);
        outputPos += 2;
      }
    } else {
      // Literal stream: copy the following words
      const runCount = lengthByte + 1;
      
      for (let i = 0; i < runCount && outputPos + 2 <= decompressedSize; i++) {
        if (sourcePos + 2 <= sourceEnd) {
          const word = input.getUint16(sourcePos, false);
          sourcePos += 2;
          outputView.setUint16(outputPos, word, false);
          outputPos += 2;
        }
      }
    }
  }

  return ok({ data: output, decompressedSize, compressionType });
}

/**
 * Compresses data using RLW compression
 */
export function rlwCompress(decompressedBuffer: ArrayBuffer): ArrayBuffer {
  // Handle odd-sized buffers by padding with a zero byte
  // This matches the behavior of the original Mighty Mike compressor (e.g. clown.map-3)
  let bufferToCompress = decompressedBuffer;
  if (decompressedBuffer.byteLength % 2 !== 0) {
    const padded = new Uint8Array(decompressedBuffer.byteLength + 1);
    padded.set(new Uint8Array(decompressedBuffer));
    // Last byte is already 0 by allocation
    bufferToCompress = padded.buffer;
  }

  const input = new DataView(bufferToCompress);
  const inputSize = bufferToCompress.byteLength;
  
  // Worst case: no compression + header (each word gets 1 length byte)
  const maxOutputSize = 8 + (inputSize / 2) * 3;
  const output = new ArrayBuffer(maxOutputSize);
  const outputView = new DataView(output);
  
  // Write header
  outputView.setUint32(0, decompressedBuffer.byteLength, false); // decompressed size (original, not padded)
  outputView.setUint32(4, PACK_TYPE_RLW, false); // compression type
  
  let inputPos = 0;
  let outputPos = 8;
  
  while (inputPos + 2 <= inputSize) {
    // Check for runs of identical words
    const currentWord = input.getUint16(inputPos, false);
    let runLength = 1;

    while (
      inputPos + runLength * 2 + 2 <= inputSize &&
      runLength < 128 &&
      input.getUint16(inputPos + runLength * 2, false) === currentWord
    ) {
      runLength++;
    }

    if (runLength >= 2) {
      // Worth compressing as a run (Run of 2 = 3 bytes vs 2 literals = 5 bytes)
      outputView.setUint8(outputPos++, 0x80 | (runLength - 1));
      outputView.setUint16(outputPos, currentWord, false);
      outputPos += 2;
      inputPos += runLength * 2;
    } else {
      // Count literal words until we find a good run
      let literalCount = 1;
      let nextPos = inputPos + 2;

      while (literalCount < 128 && nextPos + 2 <= inputSize) {
        const word = input.getUint16(nextPos, false);
        let nextRunLength = 1;

        while (
          nextPos + nextRunLength * 2 + 2 <= inputSize &&
          nextRunLength < 128 &&
          input.getUint16(nextPos + nextRunLength * 2, false) === word
        ) {
          nextRunLength++;
        }

        if (nextRunLength >= 2) {
          // Found a good run, stop collecting literals
          break;
        }

        literalCount++;
        nextPos += 2;
      }
      
      // Write literal stream
      outputView.setUint8(outputPos++, literalCount - 1);
      for (let i = 0; i < literalCount && inputPos + i * 2 < inputSize; i++) {
        outputView.setUint16(outputPos, input.getUint16(inputPos + i * 2, false), false);
        outputPos += 2;
      }
      inputPos += literalCount * 2;
    }
  }
  
  // Return trimmed buffer
  return output.slice(0, outputPos);
}
