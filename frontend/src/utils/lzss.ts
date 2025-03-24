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

//"Compression" algorithm, gets the data in a format that can be read by the game's decompressor, but makes it bigger
export function lzssCompress(decompressedDataView: DataView) {
  const sourceSize = decompressedDataView.byteLength;
  const ringBuffer = new DataView(new ArrayBuffer(RING_BUFF_SIZE + F - 1));
  const outputBuffer = new DataView(new ArrayBuffer(sourceSize * 2));

  let ringBufferPos = RING_BUFF_SIZE - F;
  let sourcePos = 0;
  let destPos = 0;
  let flags = 0;
  let flagPos = 0;
  let flagBitsUsed = 0;

  // Initialize ring buffer with spaces
  for (let i = 0; i < RING_BUFF_SIZE - F; i++) {
    ringBuffer.setUint8(i, " ".charCodeAt(0));
  }

  // Reserve space for the first flag byte
  flagPos = destPos++;
  flags = 0;

  while (sourcePos < sourceSize) {
    // Start new flag byte if needed
    if (flagBitsUsed === 8) {
      outputBuffer.setUint8(flagPos, flags);
      flagPos = destPos++;
      flags = 0;
      flagBitsUsed = 0;
    }

    // Find longest match in ring buffer
    let bestLength = 0;
    let bestOffset = 0;
    const maxSearchLength = Math.min(F, sourceSize - sourcePos);

    if (sourcePos + THRESHOLD < sourceSize) {
      for (let i = 0; i < RING_BUFF_SIZE; i++) {
        let matchLength = 0;
        while (
          matchLength < maxSearchLength &&
          decompressedDataView.getUint8(sourcePos + matchLength) ===
            ringBuffer.getUint8((i + matchLength) & (RING_BUFF_SIZE - 1))
        ) {
          matchLength++;
        }
        if (matchLength > bestLength) {
          bestLength = matchLength;
          bestOffset = i;
          if (bestLength >= F) break;
        }
      }
    }

    if (bestLength <= THRESHOLD) {
      // Output literal byte
      const byte = decompressedDataView.getUint8(sourcePos++);
      outputBuffer.setUint8(destPos++, byte);
      flags |= 1 << flagBitsUsed;

      // Update ring buffer
      ringBuffer.setUint8(ringBufferPos++, byte);
      ringBufferPos &= RING_BUFF_SIZE - 1;
    } else {
      // Output match (offset/length pair)
      const length = bestLength - THRESHOLD - 1;
      outputBuffer.setUint8(destPos++, bestOffset & 0xff);
      outputBuffer.setUint8(
        destPos++,
        ((bestOffset >> 4) & 0xf0) | (length & 0x0f),
      );

      // Update ring buffer with matched data
      for (let i = 0; i < bestLength; i++) {
        const byte = decompressedDataView.getUint8(sourcePos + i);
        ringBuffer.setUint8(ringBufferPos++, byte);
        ringBufferPos &= RING_BUFF_SIZE - 1;
      }
      sourcePos += bestLength;
    }

    flagBitsUsed++;
  }

  // Write final flag byte if needed
  if (flagBitsUsed > 0) {
    outputBuffer.setUint8(flagPos, flags);
  }

  return new DataView(outputBuffer.buffer.slice(0, destPos));
}

/* 
OTTO MATIC SOURCE CODE:

#define RING_BUFF_SIZE		 		4096			 size of ring buffer 
#define F		   		18							 upper limit for match_length 
#define THRESHOLD		2   						 encode string into position and length if match_length is greater than this 
#define LZSS_NIL		RING_BUFF_SIZE				 index for root of binary search trees 

long LZSS_Decode(short fRefNum, Ptr destPtr, long sourceSize)
{
short  		i, j, k, r;
unsigned short  flags;
Ptr			srcOriginalPtr;
unsigned char *sourcePtr,c;
Ptr			initialDestPtr = destPtr;

				// GET MEMORY FOR LZSS DATA 

	// ring buffer of size N, with extra F-1 bytes to facilitate string comparison
	uint8_t	*textBuffer	= (uint8_t*)AllocPtr(RING_BUFF_SIZE + F - 1);

	// left & right children & parents -- These constitute binary search trees.
	short	*lson		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 1));
	short	*rson		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 257));
	short	*dad		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 1));

	// ZS pack buffer
	srcOriginalPtr = (Ptr)AllocPtr(sourceSize+1);

	sourcePtr = (unsigned char *)srcOriginalPtr;

	GAME_ASSERT(textBuffer);
	GAME_ASSERT(lson);
	GAME_ASSERT(rson);
	GAME_ASSERT(dad);
	GAME_ASSERT(srcOriginalPtr);

				// READ LZSS DATA 

	FSRead(fRefNum,&sourceSize,srcOriginalPtr);



					// DECOMPRESS IT 

	for (i = 0; i < (RING_BUFF_SIZE - F); i++)						// clear buff to "default char"? (BLG)
		textBuffer[i] = ' ';

	r = RING_BUFF_SIZE - F;
	flags = 0;
	for ( ; ; )
	{
		if (((flags >>= 1) & 256) == 0)
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			c = *sourcePtr++;					// get a source byte
			flags = (unsigned short)c | 0xff00;							// uses higher byte cleverly
		}
													// to count eight
		if (flags & 1)
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			c = *sourcePtr++;					// get a source byte
			*destPtr++ = c;
			textBuffer[r++] = c;
			r &= (RING_BUFF_SIZE - 1);
		}
		else
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			i = *sourcePtr++;					// get a source byte
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			j = *sourcePtr++;					// get a source byte

			i |= ((j & 0xf0) << 4);
			j = (j & 0x0f) + THRESHOLD;
			for (k = 0; k <= j; k++)
			{
				c = textBuffer[(i + k) & (RING_BUFF_SIZE - 1)];
				*destPtr++ = c;
				textBuffer[r++] = c;
				r &= (RING_BUFF_SIZE - 1);
			}
		}
	}

	size_t decompSize = destPtr - initialDestPtr;		// calc size of decompressed data


			// CLEANUP 

	SafeDisposePtr(srcOriginalPtr);				// release the memory for packed buffer
	SafeDisposePtr((Ptr)textBuffer);
	SafeDisposePtr((Ptr)lson);
	SafeDisposePtr((Ptr)rson);
	SafeDisposePtr((Ptr)dad);

	return (long) decompSize;
}


*/
