const RING_BUFF_SIZE = 4096; //4095 - 0x0fff
const THRESHOLD = 2; //Minimum length
const MAX_SIZE = 18; //Min of 2 + 4 byte uint (2+16)

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
  let ringBufferPos = RING_BUFF_SIZE - MAX_SIZE;

  //Any segment's position can be addressed with 12 bits (RING_BUFF_SIZE),
  const ringBuffer = new DataView(
    new ArrayBuffer(RING_BUFF_SIZE + MAX_SIZE - 1),
  ); //Len - RING_BUFF_SIZE + MAX_SIZE - 1
  for (let i = 0; i < RING_BUFF_SIZE - MAX_SIZE; i++)
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
      byteLength = (byteLength & 0x0f) + THRESHOLD + 1; //byteLength - Length Value

      //Copy over (length) bytes
      for (let i = 0; i < byteLength; i++) {
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

export function lzssCompress(decompressedDataView: DataView) {
  const outputBuffer = new DataView(
    new ArrayBuffer(decompressedDataView.byteLength * 2),
  );
  const ringBuffer = new DataView(
    new ArrayBuffer(RING_BUFF_SIZE + MAX_SIZE - 1),
  ); //Len - RING_BUFF_SIZE + MAX_SIZE - 1
  for (let i = 0; i < RING_BUFF_SIZE - MAX_SIZE; i++) {
    ringBuffer.setUint8(i, " ".charCodeAt(0));
  }

  let sourceBufferPos = 0; //Buffer offset
  let destBufferPos = 0; //Buffer offset
  let ringBufferPos = RING_BUFF_SIZE - MAX_SIZE;
  let flagByte = 0;
  let flagCount = 0; //# of bits used in the current flag byte
  let flagPos = 0;

  // Reserve space for the first flag byte
  flagPos = destBufferPos++;

  while (sourceBufferPos < decompressedDataView.byteLength) {
    //Set new flag byte if the current one is full
    if (flagCount === 8) {
      outputBuffer.setUint8(flagPos, flagByte);
      flagPos = destBufferPos++;
      flagByte = 0;
      flagCount = 0;
    }

    //Find the longest match in the ring buffer
    let bestLength = 0;
    let bestOffset = 0;

    //Search for matches
    for (let i = 0; i < RING_BUFF_SIZE - MAX_SIZE; i++) {
      let length = 0;
      while (
        length < MAX_SIZE &&
        sourceBufferPos + length < decompressedDataView.byteLength &&
        ringBuffer.getUint8((i + length) & (RING_BUFF_SIZE - 1)) ===
          decompressedDataView.getUint8(sourceBufferPos + length)
      ) {
        length++;
        if (length >= MAX_SIZE) break; //Max length
      }

      if (length > bestLength) {
        bestLength = length;
        bestOffset = i;
      }
    }

    //Check match size
    if (
      bestLength > THRESHOLD &&
      checkBufferSafe(ringBufferPos, bestOffset, bestLength)
    ) {
      //Output the match
      const lengthCode = bestLength - THRESHOLD - 1; // adjust to 0-15 range (matches decompression)
      const highOffset = (bestOffset >> 8) & 0x0f; // Get top 4 bits of offset

      //Output the lower byte of the offset
      outputBuffer.setUint8(destBufferPos++, bestOffset & 0xff);

      //Output the upper byte of the offset + length code
      outputBuffer.setUint8(destBufferPos++, (highOffset << 4) | lengthCode);

      //Update the ring buffer with all the matched bytes
      for (let i = 0; i < bestLength; i++) {
        const byte = decompressedDataView.getUint8(sourceBufferPos + i);
        ringBuffer.setUint8(ringBufferPos, byte);
        ringBufferPos++;
        if (ringBufferPos >= RING_BUFF_SIZE) {
          ringBufferPos = 0; //Loop around after 4095
        }
      }

      sourceBufferPos += bestLength;
      flagCount++;
      //Don't need to set the flag bit, already 0
    } else {
      //Output a literal byte
      const byte = decompressedDataView.getUint8(sourceBufferPos++);
      outputBuffer.setUint8(destBufferPos++, byte);

      flagByte |= 1 << flagCount; //Set the flag bit
      flagCount++;
      ringBuffer.setUint8(ringBufferPos, byte);

      ringBufferPos++;
      if (ringBufferPos >= RING_BUFF_SIZE) {
        ringBufferPos = 0; //Loop around after 4095
      }
    }
  }

  // Only write the final flag byte if we have flags to write
  if (flagCount > 0) {
    outputBuffer.setUint8(flagPos, flagByte);
  }

  //Get substring of outputBuffer
  const outputBufferSlice = outputBuffer.buffer.slice(0, destBufferPos);
  return new DataView(outputBufferSlice);
}

function checkBufferSafe(
  ringPos: number,
  refPos: number,
  length: number,
): boolean {
  for (let i = 0; i < length; i++) {
    const pos = (refPos + i) % RING_BUFF_SIZE;
    if (pos === ringPos) {
      return false;
    }
  }

  return true;
}
