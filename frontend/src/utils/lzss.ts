const RING_BUFF_SIZE = 4096; //4095 - 0x0fff
const THRESHOLD = 2; //Minimum length
const F = 18; //Min of 2 + 4 byte uint (2+16)

//Good explanation of LZSS: https://moddingwiki.shikadi.net/wiki/LZSS_compression
//Java LZSS Implementation: https://github.com/crosswire/jsword-migration/blob/master/jsword/src/main/java/org/crosswire/common/compress/LZSS.java

export function lzssDecompress(
  compressedDataView: DataView,
  outputSize: number,
  //outputBuffer: DataView,
) {
  const outputBuffer = new DataView(new ArrayBuffer(outputSize));

  let sourceSize = compressedDataView.byteLength;

  let destBufferPos = 0; //Buffer offset
  let sourceBufferPos = 0; //Buffer offset
  let ringBufferPos = RING_BUFF_SIZE - F;

  //Any segment's position can be addressed with 12 bits (RING_BUFF_SIZE),
  const ringBuffer = new DataView(new ArrayBuffer(RING_BUFF_SIZE + F - 1)); //Len - RING_BUFF_SIZE + F - 1
  for (let i = 0; i < RING_BUFF_SIZE - F; i++)
    ringBuffer.setInt8(i, " ".charCodeAt(0));

  let flags = 0;
  while (true) {
    //Clear the latest bit flag
    flags = Math.floor(flags / 2);

    //Get the next 8 flags
    if (flags < 256) {
      if (--sourceSize < 0) break;
      const flagByte = compressedDataView.getUint8(sourceBufferPos++);
      //The 0xff keeps keeps the flags < 256 from triggering until 8 cycles (8 bits) have been used
      flags = flagByte | 0xff00;
    }

    //Checks if the latest flag is a 0 or 1
    //If 1, just copy 8 bits over
    if (flags & 1) {
      if (--sourceSize < 0) break;
      const dataByte = compressedDataView.getUint8(sourceBufferPos++);

      outputBuffer.setUint8(destBufferPos++, dataByte);

      ringBuffer.setUint8(ringBufferPos++, dataByte);

      ringBufferPos &= RING_BUFF_SIZE - 1; //Loop around after 4095
    } else {
      //12 bits for distanceOffset, 4 bits for byteLength
      if (--sourceSize < 0) break;
      let distanceOffset = compressedDataView.getUint8(sourceBufferPos++);
      if (--sourceSize < 0) break;
      let byteLength = compressedDataView.getUint8(sourceBufferPos++);

      //STEAL 4 bits from byteLength (12-bit uint - 0 - 4095)
      distanceOffset |= (byteLength & 0xf0) << 4; // distanceOffset - Distance Value

      //Ignore the 4 bits used for distanceOffset, add min value
      byteLength = (byteLength & 0x0f) + THRESHOLD; //byteLength - Length Value

      //Copy over (length) bytes
      for (let i = 0; i <= byteLength; i++) {
        const dataByte = ringBuffer.getUint8(
          (distanceOffset + i) & (RING_BUFF_SIZE - 1),
        );
        outputBuffer.setUint8(destBufferPos++, dataByte);
        ringBuffer.setUint8(ringBufferPos++, dataByte);
        ringBufferPos &= RING_BUFF_SIZE - 1; //Loop around after 4095
      }
    }
  }

  return outputBuffer;
}

//"Compression" algorithm, gets the data in a format that can be read by the game's decompressor
export function lzssCompress(decompressedDataView: DataView) {
  const sourceSize = decompressedDataView.byteLength;
  // Create a buffer to store the compressed output - worst case is slightly larger than source
  const outputBuffer = new DataView(new ArrayBuffer(sourceSize * 2));
  // Create the ring buffer
  const ringBuffer = new DataView(new ArrayBuffer(RING_BUFF_SIZE + F - 1));

  // Initialize ring buffer with spaces (matching the decompression algorithm)
  for (let i = 0; i < RING_BUFF_SIZE - F; i++) {
    ringBuffer.setUint8(i, " ".charCodeAt(0));
  }

  let outputPos = 0; // Current position in output buffer
  let flagPos = 0; // Position where the current flag byte is stored
  let bitCount = 0; // Number of bits used in the current flag byte
  let flags = 0; // Current flag byte

  // Reserve space for the first flag byte
  flagPos = outputPos++;

  let sourcePos = 0;
  let ringPos = RING_BUFF_SIZE - F; // Match the initial position used in decompression

  // Create a lookup table for faster matching
  // This simulates the binary tree structure from the original C code in a simpler way
  const position = new Map<number, number[]>();

  while (sourcePos < sourceSize) {
    // Start a new flag byte if the current one is full
    if (bitCount === 8) {
      outputBuffer.setUint8(flagPos, flags);
      flagPos = outputPos++;
      flags = 0;
      bitCount = 0;
    }

    // Find the longest match in the ring buffer
    let bestLength = 0;
    let bestOffset = 0;

    // Only search for matches if we have enough data left to make it worthwhile
    if (sourcePos + THRESHOLD < sourceSize) {
      const maxMatchLength = Math.min(F, sourceSize - sourcePos);

      // Get a hash of the current sequence to look up potential matches
      // This is a faster alternative to the binary tree in the original C code
      const hash =
        (decompressedDataView.getUint8(sourcePos) << 8) |
        decompressedDataView.getUint8(sourcePos + 1);

      const potentialMatches = position.get(hash) || [];

      // Check each potential match position
      for (const offset of potentialMatches) {
        let matchLength = 0;

        // Check how many bytes match at this position
        while (
          matchLength < maxMatchLength &&
          ringBuffer.getUint8((offset + matchLength) % RING_BUFF_SIZE) ===
            decompressedDataView.getUint8(sourcePos + matchLength)
        ) {
          matchLength++;
        }

        // If this is the best match so far, remember it
        if (matchLength > bestLength) {
          bestLength = matchLength;
          bestOffset = offset;

          // If we found a match of maximum length, no need to search further
          if (bestLength >= maxMatchLength) {
            break;
          }
        }
      }

      // Add the current position to the hash table for future lookups
      if (sourcePos + 1 < sourceSize) {
        const newHash =
          (decompressedDataView.getUint8(sourcePos) << 8) |
          decompressedDataView.getUint8(sourcePos + 1);
        if (!position.has(newHash)) {
          position.set(newHash, []);
        }
        position.get(newHash)?.push(ringPos);

        // Limit the number of positions we track per hash to avoid memory issues
        if (position.get(newHash)!.length > 100) {
          position.get(newHash)!.shift(); // Remove oldest position
        }
      }
    }

    // Decide whether to output a literal or a match
    if (bestLength <= THRESHOLD) {
      // Output a literal byte
      const byte = decompressedDataView.getUint8(sourcePos++);
      outputBuffer.setUint8(outputPos++, byte);

      // Set the flag bit for a literal
      flags |= 1 << bitCount;

      // Update the ring buffer
      ringBuffer.setUint8(ringPos, byte);
      ringPos = (ringPos + 1) % RING_BUFF_SIZE;
    } else {
      // Output a match (offset and length)
      // First byte is lower 8 bits of offset
      outputBuffer.setUint8(outputPos++, bestOffset & 0xff);

      // Second byte: 4 high bits of offset + (length - THRESHOLD) in low 4 bits
      const lengthCode = bestLength - THRESHOLD - 1; // adjust to 0-15 range
      const highOffset = (bestOffset >> 8) & 0x0f; // Get top 4 bits of offset
      outputBuffer.setUint8(outputPos++, (highOffset << 4) | lengthCode);

      // Update the ring buffer with all the matched bytes
      for (let i = 0; i < bestLength; i++) {
        const byte = decompressedDataView.getUint8(sourcePos + i);
        ringBuffer.setUint8(ringPos, byte);
        ringPos = (ringPos + 1) % RING_BUFF_SIZE;
      }

      // Move forward in the source
      sourcePos += bestLength;
    }

    // Move to the next bit in the flag byte
    bitCount++;
  }

  // Write the final flag byte if it contains any flags
  if (bitCount > 0) {
    outputBuffer.setUint8(flagPos, flags);
  }

  // Return just the part of the buffer that was used
  return new DataView(outputBuffer.buffer.slice(0, outputPos));
}
